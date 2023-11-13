import Logger from '../helpers/logger';

export class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.code = 400;
        Error.captureStackTrace(this, this.constructor);
    }
}

export function responseExceptionSilent(res, err, code, message) {
    Logger.httpError(err.constructor.name, err.code, err.message, err);

    if (err.code) {
        return res.status(err.code).send({ error: message });
    }

    res.status(code).send({ error: message });
}