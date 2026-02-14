import * as Types from "../index.d";

export default class GetPermissions {
    private static is(params: {
        entity?: Types.AllRoles | Types.Permissions,
        values: Array<Types.UnitPermissions>
    }) {
        const { entity, values } = params;
        let permission: Types.Permissions | undefined;

        if (typeof entity === "string") {
            permission = entity;
        } else {
            permission = entity?.permissions;
        }

        const normalize = (value: Types.UnitPermissions) => [value, value.toUpperCase(), value.toLowerCase()];
        const valuesParsed = Array.from(new Set(values.flatMap(normalize)));

        return valuesParsed.includes(permission || "");
    }

    static isUser(entity?: Types.AllRoles | Types.Permissions): entity is Types.User {
        const values = ["User", "Usuario"] as Array<Types.UserUnitPermissions>;
        return this.is({ entity, values });
    }

    static isGerente(entity?: Types.AllRoles | Types.Permissions): entity is Types.Gerente {
        const values = ["Gerente"] as Array<Types.GerenteUnitPermissions>;
        return this.is({ entity, values });
    }

    static isAdmin(entity?: Types.AllRoles | Types.Permissions): entity is Types.Admin {
        const values = ["Admin", "Administrador", "Administrator"] as Array<Types.AdminUnitPermissions>;
        return this.is({ entity, values });
    }

    static isMaster(entity?: Types.AllRoles | Types.Permissions): entity is Types.Master {
        const values = ["Master", "Maestro"] as Array<Types.MasterUnitPermissions>;
        return this.is({ entity, values });
    }
}