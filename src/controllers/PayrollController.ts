import { Request, Response } from "express";
import { AssistanceLetter, Assistance, Schedule, Repository, Module, Employee } from "../index.d";
import { NODE_ENV } from "../config/api";
import GetPermissions from "../utils/Permissions";
import Cache from "../utils/Cache";
import fs from "fs/promises";

type KeyDayMap = "Dom" | "Lun" | "Mar" | "Mie" | "Mié" | "Jue" | "Vie" | "Sab" | "Sáb";
type DayName = "Domingo" | "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado";

interface ResultCompareScheduleWithAssistance {
    dayName: string
    date?: string
    expectedEntry?: string
    expectedExit?: string
    realEntry?: string
    realExit?: string
    hours: number
    observations?: string
    letter: AssistanceLetter
    fullWorked: boolean
    extraHours: number
}

interface ComparisonDataType {
    name: string
    descuentoRetardos: number
    semanalSalary: number
    pagoPorHora: number
    pagoDiario: number
    pago: number
    code: string
    imss: number
    days: Array<ResultCompareScheduleWithAssistance>
    imssDetalle: {
        patron?: number
        trabajador?: number
        total?: number
    }
    totalHours: number
    totalR2R3: number
    totalEffectiveDaysWorked: number
    totalDaysValidWorked: number
    totalDaysWorked: number
    totalFullDaysWorked: number
    totalNotDefinedDaysWorked: number
    totalFullDaysValidWorked: number
    daysNotFullWorked: Array<ResultCompareScheduleWithAssistance>
    daysNotFullValidWorked: Array<ResultCompareScheduleWithAssistance>
}

export default class PayrollController {
    private ModuleRepository: Repository<Module>;
    private EmployeeRepository: Repository<Employee>;
    private cache: Cache;
    private dayMap: Record<KeyDayMap, DayName> = {
        Dom: "Domingo",
        Lun: "Lunes",
        Mar: "Martes",
        Mie: "Miércoles",
        Mié: "Miércoles",
        Jue: "Jueves",
        Vie: "Viernes",
        Sab: "Sábado",
        Sáb: "Sábado",
    };

    constructor (EmployeeRepository: Repository<Employee>, ModuleRepository: Repository<Module>, cache: Cache)  {
        this.EmployeeRepository = EmployeeRepository;
        this.ModuleRepository = ModuleRepository;
        this.cache = cache;
    }

    private parseHoursToMinutes = (hour: string) => {
        const [h, m, s] = hour.split(':').map(Number);
        return h * 60 + m + (s ?? 0) / 60;
    }

    private getWorkedHoursAndObservations = ({ entryHour, exitHour }: Record<"entryHour" | "exitHour", string | undefined>) => {
        if ((!entryHour || entryHour === "--------") && (!exitHour || exitHour === "--------")) return { hours: 0, observations: "No trabajado" };
        if ((!entryHour || entryHour === "--------") && exitHour) return { hours: 0, observations: "Sin entrada" };
        if (entryHour && (!exitHour || exitHour === "--------")) return { hours: 0, observations: "Sin salida" };

        const [h1] = entryHour!.split(':').map(Number);
        const [h2] = exitHour!.split(':').map(Number);
        const inicio = this.parseHoursToMinutes(entryHour!);
        let fin = this.parseHoursToMinutes(exitHour!);

        if (h1 > h2) fin += 24 * 60;

        const diff = fin - inicio;

        if (diff <= 1) return { hours: diff, observations: "Entrada y salida similares" };

        const horas = diff / 60;

        if (horas < 9) return { hours: horas, observations: "Pagar por horas" };

        return { hours: parseFloat(horas.toFixed(2)) };
    }

    private compareEntryHours = ({ entryHourSchedule, entryHourAssistance }: Record<"entryHourSchedule" | "entryHourAssistance", string | undefined>): AssistanceLetter => {
        const hasSchedule = entryHourSchedule && entryHourSchedule !== "--------";
        const hasAssistance = entryHourAssistance && entryHourAssistance !== "--------";

        if (!hasSchedule && !hasAssistance) return "D";
        if (hasSchedule && !hasAssistance) return "F";
        if (!hasSchedule && hasAssistance) return "ND";

        const scheduleMin = this.parseHoursToMinutes(entryHourSchedule!);
        const assistMin = this.parseHoursToMinutes(entryHourAssistance!);
        const diff = assistMin - scheduleMin;

        if (diff < 0) return "A";
        if (diff <= 10) return "R1";
        if (diff <= 20) return "R2";
        return "R3";
    }

    private compareScheduleWithAssistance = (schedule: Array<Schedule>, assistance: Array<Omit<Assistance, "letter">>) => {
        const uniqueDays = Array.from(new Set(Object.values(this.dayMap))) as Array<DayName>;
        const results: Array<ResultCompareScheduleWithAssistance> = [];

        for (const dayName of uniqueDays) {
            const scheduleDay = schedule.find(day => day.dayName === dayName);
            const assistanceDay = assistance.find(day => day.dayName === dayName);

            const expectedEntry = scheduleDay?.startHour;
            const expectedExit = scheduleDay?.endHour;
            const realEntry = assistanceDay?.startHour;
            const realExit = assistanceDay?.endHour;
            const date = assistanceDay?.date;

            const letter = this.compareEntryHours({ entryHourSchedule: expectedEntry, entryHourAssistance: realEntry });
            const { hours, observations } = this.getWorkedHoursAndObservations({ entryHour: realEntry, exitHour: realExit });
            const extraHours = Math.max(0, hours - 9);
            const fullWorked = hours >= 9;

            results.push({
                dayName, 
                date, 
                expectedEntry, 
                expectedExit, 
                realEntry, 
                realExit, 
                hours,
                fullWorked,
                observations, 
                letter,
                extraHours
            });
        }

        let totalHours = 0;
        let totalR2R3 = 0;

        for (const r of results) {
            totalHours += r.hours;
            if (r.letter === "R2" || r.letter === "R3") totalR2R3++;
        }

        totalHours = parseFloat(totalHours.toFixed(2));

        const lettersNotIncluded = ["D", "F"];
        const daysNotFullWorked = results.filter(r => !r.fullWorked && !lettersNotIncluded.includes(r.letter));
        const daysNotFullValidWorked = daysNotFullWorked.filter(r => r.letter !== "ND");
        const totalFullDaysWorked = results.filter(r => r.fullWorked).length;
        const totalFullDaysValidWorked = results.filter(r => r.fullWorked && r.letter !== "ND").length;
        const totalNotDefinedDaysWorked = results.filter(r => r.letter === "ND").length;
        const totalDaysWorked = results.filter(r => r.hours > 0).length;
        const totalDaysValidWorked = results.filter(r => r.hours > 0 && r.letter !== "ND").length;
        const totalEffectiveDaysWorked = Math.max(0, results.filter(r => r.hours > 0).length - Math.floor(totalR2R3 / 3));

        if (NODE_ENV === "development") {
            console.log({ days: results, totalHours, totalR2R3, totalEffectiveDaysWorked, totalDaysWorked, totalFullDaysWorked, daysNotFullWorked, totalNotDefinedDaysWorked, totalDaysValidWorked, daysNotFullValidWorked, totalFullDaysValidWorked })
        }

        return { days: results, totalHours, totalR2R3, totalEffectiveDaysWorked, totalDaysWorked, totalFullDaysWorked, daysNotFullWorked, totalNotDefinedDaysWorked, totalDaysValidWorked, daysNotFullValidWorked, totalFullDaysValidWorked };
    }

    private selectBestAssistance(entries: Omit<Assistance, "letter">[]): Omit<Assistance, "letter"> {
        if (entries.length === 1) return entries[0];

        const targetMinutes = this.parseHoursToMinutes("08:00");

        return entries.reduce((best, current) => {
            const currentDiff = Math.abs(this.parseHoursToMinutes(current.startHour || "00:00") - targetMinutes);
            const bestDiff = Math.abs(this.parseHoursToMinutes(best.startHour || "00:00") - targetMinutes);
            return currentDiff < bestDiff ? current : best;
        }, entries[0]);
    }

    private parseAssistance = async (file: Express.Multer.File) => {
        const filePath = file.originalname;
        await fs.writeFile(filePath, file.buffer);

        const rawBuffer = await fs.readFile(filePath);
        let encoding: BufferEncoding = "utf-8";

        if (rawBuffer[0] === 0xFF && rawBuffer[1] === 0xFE) {
            encoding = "utf16le";
        } else if (rawBuffer[0] === 0xFE && rawBuffer[1] === 0xFF) {
            throw new Error("UTF-16BE no soportado");
        } else if (rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF) {
            encoding = "utf-8";
        }

        const content = rawBuffer.toString(encoding);
        fs.unlink(filePath);

        const lines: Array<string> = content
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
        const result = [];

        let current = null;
        let parsingAssistance = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith("Codigo")) {
                const code = line.split(":")[1].trim();
                const name = lines[i + 1]?.split(":")[1]?.trim() || "Desconocido";
                current = { name, code, assistance: [] as Array<Omit<Assistance, "letter">> };
                result.push(current);
                continue;
            }

            if (line.startsWith("Dia")) {
                parsingAssistance = true;
                i += 1;
                continue;
            }

            if (line.startsWith("Horas Trabajadas")) {
                parsingAssistance = false;
                continue;
            }

            if (parsingAssistance && current) {
                const parts = line.split(/\s+/);
                const diaAbreviado = parts[0] as KeyDayMap;
                const dayName = this.dayMap[diaAbreviado] || diaAbreviado;
                const date = parts[1];
                const entry = parts[2];
                const exit = parts[3];

                const asistencia: Omit<Assistance, "letter"> = { dayName, date };
                if (entry !== "--------") asistencia.startHour = entry;
                if (exit !== "--------") asistencia.endHour = exit;

                if (asistencia.startHour || asistencia.endHour) current.assistance.push(asistencia);
            }
        }

        return { data: result };
    }

    private getEmployeeByCode = async (moduleId: string, userCode: string) => {
        try {
            const moduleCacheKey = `module:id=${moduleId}`;
            let module = await this.cache.get<Module>(moduleCacheKey);

            if (!module) {
                const resultModule = await this.ModuleRepository.getById(moduleId);

                if (!resultModule.success || !resultModule.data) return;

                module = resultModule.data;
                await this.cache.set(moduleCacheKey, module, { time: 3, unit: "minutes", onExpire: (value) => console.log(`Módulo expirado: ${value}`) });
            }

            const employeeMeta = module.employees.find(emp => emp.code === userCode);
            if (!employeeMeta) return;

            const empCacheKey = `employee:${employeeMeta.id}`;
            let employee = await this.cache.get<Employee>(empCacheKey);

            if (!employee) {
                const resultEmployee = await this.EmployeeRepository.getById(employeeMeta.id);

                if (!resultEmployee.success || !resultEmployee.data?.active) return;

                employee = resultEmployee.data;
                await this.cache.set(empCacheKey, employee, { time: 3, unit: "minutes" });
            }

            return employee;
        } catch (error) {
            console.error(`Error en getEmployeeByCode con caché: ${error}`);
        }
    };

    private calculateImssFeePerDay(sueldoDiario: number): Record<"patron" | "trabajador" | "total", number> {
        const UMA = 108.57;
        const SBC = sueldoDiario;
        const excedente = Math.max(0, SBC - (UMA * 3));

        // Cuotas simplificadas por día
        const em_patron_fijo = UMA * 0.204;

        const em_patron = excedente * 0.011;
        const em_trabajador = excedente * 0.004;
        const ceve_patron = SBC * 0.0315;
        const ceve_trabajador = SBC * 0.01125;
        const iv_patron = SBC * 0.0175;
        const iv_trabajador = SBC * 0.00625;
        const riesgo_patron = SBC * 0.005;
        const guarderias_patron = SBC * 0.01;

        const totalPatron = em_patron_fijo + em_patron + ceve_patron + iv_patron + riesgo_patron + guarderias_patron;
        const totalTrabajador = em_trabajador + ceve_trabajador + iv_trabajador;

        return {
            patron: parseFloat(totalPatron.toFixed(2)),
            trabajador: parseFloat(totalTrabajador.toFixed(2)),
            total: parseFloat((totalPatron + totalTrabajador).toFixed(2))
        };
    }

    calculatePayroll = async (req: Request, res: Response) => {
        let { id: moduleId } = req.params;

        if(typeof moduleId !== 'string') moduleId = moduleId[0];

        const files = req.files as Array<Express.Multer.File> | undefined;

        try {
            if (!files || files.length === 0) {
                res.status(400).json({ message: "No se seleccionaron archivos de asistencia" });
                return;
            }

            const parsedFiles = await Promise.all(files.map(this.parseAssistance));
            const allAssistance = parsedFiles.flatMap(parsed => parsed.data);
            const assistanceMap = new Map<string, { assistance: Array<Omit<Assistance, "letter">>, name: string, code: string }>();

            for (const record of allAssistance) {
                for (const entry of record.assistance) {
                    const key = `${record.code}_${entry.date}`;
                    if (!assistanceMap.has(key)) {
                        assistanceMap.set(key, { name: record.name, code: record.code, assistance: [] });
                    }
                    assistanceMap.get(key)?.assistance.push(entry);
                }
            }

            const groupedByEmployee = new Map<string, Array<Omit<Assistance, "letter">>>();
            const employeeInfoMap = new Map<string, { name: string, code: string }>();

            for (const [key, value] of assistanceMap.entries()) {
                const [code] = key.split("_");
                const keyGroup = code;

                if (!groupedByEmployee.has(keyGroup)) groupedByEmployee.set(keyGroup, []);

                groupedByEmployee.get(keyGroup)?.push(this.selectBestAssistance(value.assistance));

                employeeInfoMap.set(code, { name: value.name, code: value.code });
            }

            const comparisonData = [] as Array<ComparisonDataType>;

            for (const [code, assistance] of groupedByEmployee.entries()) {
                const employee = await this.getEmployeeByCode(moduleId, code);
                if (!employee) continue;

                const { schedule, semanalSalary: salary } = employee;
                const results = this.compareScheduleWithAssistance(schedule, assistance);

                const pagoDiario = salary / 6;
                const pagoPorHora = pagoDiario / 9;
                const pagoBase = pagoDiario * results.totalFullDaysValidWorked;
                const descuentoDias = Math.floor(results.totalR2R3 / 3);
                const pagoDescuento = descuentoDias * pagoDiario;
                const pagoDeIncompletos = results.daysNotFullValidWorked.reduce((pay, r) => pay + Math.floor(r.hours) * pagoPorHora, 0);

                if (NODE_ENV === "development") {
                    console.log({ pagoBase, pagoDeIncompletos })
                }

                let pagoDeImss = 0;
                let imssDetalle = {} as Record<"patron" | "trabajador" | "total", number>
                if (employee.imss) {
                    const diasPagados = results.totalDaysWorked;
                    imssDetalle = this.calculateImssFeePerDay(pagoDiario);
                    pagoDeImss = imssDetalle.trabajador * diasPagados;
                }

                const pagoFinal = pagoBase - pagoDescuento + pagoDeIncompletos - pagoDeImss;

                comparisonData.push({
                    name: employee.name,
                    descuentoRetardos: pagoDescuento,
                    code: employee.code,
                    imss: pagoDeImss,
                    imssDetalle,
                    ...results,
                    semanalSalary: salary,
                    pagoPorHora,
                    pagoDiario,
                    pago: pagoFinal
                });
            }

            res.status(200).json({ 
                data: comparisonData, 
                message: `Nómina generada correctamente a partir de ${files.length} ${files.length === 1 ? "archivo" : "archivos"}` 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al calcular el pago", error });
        }
    }

    getModules = async (req: Request, res: Response) => {
        const { permissions, id } = req.session!.user!;
        const cacheKey = `modules:${id}`;
        let modules = await this.cache.get<Array<Module>>(cacheKey);

        if (!modules) {
            modules = [];

            if (GetPermissions.isGerente(permissions)) {
                const employeeResult = await this.EmployeeRepository.getById(id);
    
                if (!employeeResult.success) {
                    res.status(500).json({ message: "Ocurrió un error inesperado al consultar los módulos, lamentamos las molestias", error: employeeResult.error });
                    return;
                }
    
                const moduleIds = employeeResult.data?.modules || [];
                const moduleResponses = await Promise.all(moduleIds.map(moduleId => this.ModuleRepository.getById(moduleId)));
    
                for (const response of moduleResponses) {
                    if (!response.success) continue;
    
                    const module = response.data;
    
                    if (module) modules.push(module);
                }
            } else {
                const moduleResult = await this.ModuleRepository.getAll();
    
                if (!moduleResult.success) {
                    res.status(500).json({ message: "Ocurrió un error inesperado al consultar los módulos, lamentamos las molestias", error: moduleResult.error });
                    return;
                }
    
                modules = moduleResult.data || [];
            }

            await this.cache.set(cacheKey, modules, { time: 2, unit: "minutes" });
        }

        res.status(200).json({ data: modules, message: "Módulos encontrados" });
    }
}