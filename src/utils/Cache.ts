import { Cache as ICache } from "../index.d";

/**
 * Tipos de unidad de tiempo válidos que se pueden usar al definir la expiración.
 */
type TimeLetter = "S" | "M" | "H" | "D" | "Ms"; // Letras simples
type TimeSingular = "Sec" | "Min" | "Hr" | "Second" | "Minute" | "Hour" | "Day"; // Formas singulares
type TimePlural = `${TimeSingular}s`; // Formas plurales
type TimeUnitAlias = TimeLetter | TimeSingular | TimePlural;
type TimeValue = TimeUnitAlias | Uppercase<TimeUnitAlias> | Lowercase<TimeUnitAlias>;

/**
 * Opciones configurables para guardar valores con expiración en caché.
 */
interface SetOptions<Input = unknown, Output = unknown> {
    time: number // Cantidad de tiempo antes de expirar
    unit?: TimeValue // Unidad de tiempo (opcional)
    onExpire?: (value: Input) => Output // Función a ejecutar al expirar
}

/**
 * Clase Cache: Implementación de caché en memoria con expiración automática.
 * 
 * Patrón Singleton: sólo se crea una instancia de esta clase.
 */
export default class Cache implements ICache {
    private static instance: Cache;
    private cache = new Map<string, unknown>();

    constructor () {
        if (Cache.instance) return Cache.instance;
        Cache.instance = this;
    }

    /* ─── Sobrecargas públicas ─────────────────────────── */
    set<Input = unknown, Output = unknown>(
        key: string,
        value: Input,
        seconds: number,
        onExpire?: (value: Input) => Output
    ): Promise<"OK">;
    set<Input = unknown, Output = unknown>(
        key: string,
        value: Input,
        options: SetOptions<Input, Output>
    ): Promise<"OK">;
    set<Input = unknown, Output = unknown>(params: {
        key: string;
        value: Input;
        time: number;
        unit?: TimeValue;
        onExpire?: (value: Input) => Output;
    }): Promise<"OK">;

    /* ─── Implementación única ─────────────────────────── */
    async set(...args: any[]): Promise<"OK"> {
        // Versión con parámetros nombrados
        if (typeof args[0] === "object" && typeof args[0].key === "string") {
            const { key, value, time, unit, onExpire } = args[0];
            return this._setCore(key, value, { time, unit, onExpire });
        }

        // Versión (key, value, seconds, onExpire?)
        if (typeof args[2] === "number") {
            const [key, value, seconds, onExpire] = args;
            return this._setCore(key, value, { time: seconds, unit: "s", onExpire });
        }

        // Versión (key, value, SetOptions)
        const [key, value, options] = args;
        return this._setCore(key, value, options);
    }

    /* ─── Lógica real, tomada del método original ──────── */
    private async _setCore<Input = unknown, Output = unknown>(
        key: string,
        value: Input,
        opts: SetOptions<Input, Output>
    ): Promise<"OK"> {
        this.cache.set(key, value);

        const ms = this.convertToMilliseconds(
            opts.time,
            opts.unit || "seconds"
        );

        setTimeout(() => {
            this.cache.delete(key);
            opts.onExpire?.(value);
        }, ms);

        return "OK";
    }

    /**
     * Obtiene el valor almacenado asociado a una clave.
     *
     * @template T Tipo esperado del valor almacenado (por defecto `unknown`).
     * @param {string} key Clave del valor.
     * @returns {Promise<T | null>} Promesa que resuelve con el valor o `null` si no se encontró.
     *
     * @example
     * const usuario = await cache.get<string>('nombre');
     */
    async get<T = unknown>(key: string): Promise<T | null> {
        const value = this.cache.get(key);

        return (value as T) || null;
    }

    /**
     * Elimina uno o más valores del caché por sus claves.
     *
     * @param {...Array<string>} keys Lista de claves a eliminar.
     * @returns {Promise<number>} Número de claves eliminadas exitosamente.
     *
     * @example
     * await cache.del('clave1', 'clave2');
     */
    async del(...keys: Array<string>): Promise<number> {
        return keys.filter(this.cache.delete).length;
    }

    /**
     * Convierte un tiempo dado y su unidad a milisegundos.
     *
     * @param {number} time Cantidad de tiempo.
     * @param {TimeValue} unit Unidad de tiempo (ej. 's', 'Min', 'Hours', etc).
     * @returns {number} Tiempo equivalente en milisegundos.
     * @throws {Error} Si la unidad no es válida.
     *
     * @example
     * convertToMilliseconds(2, 'Minutes'); // 120000
     */
    private convertToMilliseconds(time: number, unit: TimeValue): number {
        const normalized = unit.toLowerCase();

        const unitMap: Record<string, number> = {
            ms: 1,
            millisecond: 1,
            milliseconds: 1,

            s: 1000,
            sec: 1000,
            secs: 1000,
            second: 1000,
            seconds: 1000,

            m: 1000 * 60,
            min: 1000 * 60,
            mins: 1000 * 60,
            minute: 1000 * 60,
            minutes: 1000 * 60,

            h: 1000 * 60 * 60,
            hr: 1000 * 60 * 60,
            hrs: 1000 * 60 * 60,
            hour: 1000 * 60 * 60,
            hours: 1000 * 60 * 60,

            d: 1000 * 60 * 60 * 24,
            day: 1000 * 60 * 60 * 24,
            days: 1000 * 60 * 60 * 24
        };

        if (!(normalized in unitMap)) {
            throw new Error(`Invalid time unit: ${unit}`);
        }

        return time * unitMap[normalized];
    }

    static toString() {
        return "Pene";
    }
}