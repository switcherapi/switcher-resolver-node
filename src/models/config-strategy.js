import mongoose from 'mongoose';
import moment from 'moment';
import { parseJSON, payloadReader } from '../helpers/index.js';
import IPCIDR from '../helpers/ipcidr.js';
import TimedMatch from '../helpers/timed-match/index.js';

export const StrategiesType = Object.freeze({
    NETWORK: 'NETWORK_VALIDATION',
    VALUE: 'VALUE_VALIDATION',
    NUMERIC: 'NUMERIC_VALIDATION',
    TIME: 'TIME_VALIDATION',
    DATE: 'DATE_VALIDATION',
    REGEX: 'REGEX_VALIDATION',
    PAYLOAD: 'PAYLOAD_VALIDATION'
});

export const OperationsType = Object.freeze({
    EQUAL: 'EQUAL',
    NOT_EQUAL: 'NOT_EQUAL',
    EXIST: 'EXIST',
    NOT_EXIST: 'NOT_EXIST',
    GREATER: 'GREATER',
    LOWER: 'LOWER',
    BETWEEN: 'BETWEEN',
    HAS_ONE: 'HAS_ONE',
    HAS_ALL: 'HAS_ALL'
});

export function processOperation(strategy, operation, input, values) {
    switch(strategy) {
        case StrategiesType.NETWORK:
            return processNETWORK(operation, input, values);
        case StrategiesType.VALUE:
            return processVALUE(operation, input, values);
        case StrategiesType.NUMERIC:
            return processNUMERIC(operation, input, values);
        case StrategiesType.TIME:
            return processTIME(operation, input, values);
        case StrategiesType.DATE:
            return processDATE(operation, input, values);
        case StrategiesType.REGEX:
            return processREGEX(operation, input, values);
        case StrategiesType.PAYLOAD:
            return processPAYLOAD(operation, input, values);
    }
}

function processNETWORK(operation, input, values) {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/(\d|[1-2]\d|3[0-2]))$/;
    switch(operation) {
        case OperationsType.EXIST:
            return processNETWORK_Exist(input, values, cidrRegex);
        case OperationsType.NOT_EXIST:
            return processNETWORK_NotExist(input, values, cidrRegex);
    }
    return false;
}

function processNETWORK_Exist(input, values, cidrRegex) {
    for (const value of values) {
        if (value.match(cidrRegex)) {
            const cidr = new IPCIDR(value);
            if (cidr.isIp4InCidr(input)) {
                return true;
            }
        } else {
            return values.includes(input);
        }
    }
    return false;
}

function processNETWORK_NotExist(input, values, cidrRegex) {
    const result = values.filter((element) => {
        if (element.match(cidrRegex)) {
            const cidr = new IPCIDR(element);
            if (cidr.isIp4InCidr(input)) {
                return true;
            }
        } else {
            return values.includes(input);
        }
    });
    return result.length === 0;
}

function processVALUE(operation, input, values) {
    switch(operation) {
        case OperationsType.EXIST:
            return values.includes(input);
        case OperationsType.NOT_EXIST:
            return !values.includes(input);
        case OperationsType.EQUAL:
            return input === values[0];
        case OperationsType.NOT_EQUAL:
            return values.filter(element => element === input).length === 0;
    }
}

function processNUMERIC(operation, input, values) {
    const inputStr = String(input);
    switch(operation) {
        case OperationsType.EXIST:
            return processVALUE(operation, inputStr, values);
        case OperationsType.NOT_EXIST:
            return processVALUE(operation, inputStr, values);
        case OperationsType.EQUAL:
            return processVALUE(operation, inputStr, values);
        case OperationsType.NOT_EQUAL:
            return processVALUE(operation, inputStr, values);
        case OperationsType.LOWER:
            return inputStr < values[0];
        case OperationsType.GREATER:
            return inputStr > values[0];
        case OperationsType.BETWEEN:
            return inputStr >= values[0] && inputStr <= values[1];
    }
}

function processTIME(operation, input, values) {
    const today = moment().format('YYYY-MM-DD');

    switch(operation) {
        case OperationsType.LOWER:
            return moment(`${today}T${input}`).isSameOrBefore(`${today}T${values[0]}`);
        case OperationsType.GREATER:
            return moment(`${today}T${input}`).isSameOrAfter(`${today}T${values[0]}`);
        case OperationsType.BETWEEN:
            return moment(`${today}T${input}`).isBetween(`${today}T${values[0]}`, `${today}T${values[1]}`);
    }
}

function processDATE(operation, input, values) {
    switch(operation) {
        case OperationsType.LOWER:
            return moment(input).isSameOrBefore(values[0]);
        case OperationsType.GREATER:
            return moment(input).isSameOrAfter(values[0]);
        case OperationsType.BETWEEN:
            return moment(input).isBetween(values[0], values[1]);
    }
}

function processREGEX(operation, input, values) {
    switch(operation) {
        case OperationsType.EXIST:
            return TimedMatch.tryMatch(values, input);
        case OperationsType.NOT_EXIST:
            return !processREGEX(OperationsType.EXIST, input, values);
        case OperationsType.EQUAL:
            return TimedMatch.tryMatch([String.raw`\b${values[0]}\b`], input);
        case OperationsType.NOT_EQUAL:
            return !TimedMatch.tryMatch([String.raw`\b${values[0]}\b`], input);
    }
}

function processPAYLOAD(operation, input, values) {
    const inputJson = parseJSON(input);
    if (!inputJson) {
        return false;
    }

    const keys = payloadReader(inputJson);
    switch(operation) {
        case OperationsType.HAS_ONE:
            return keys.some(key => values.includes(key));
        case OperationsType.HAS_ALL:
            return values.every(element => keys.includes(element));
    }
}

const configStrategySchema = new mongoose.Schema({
    description: {
        type: String,
        trim: true,
        maxlength: 256
    },
    activated: {
        type: Map,
        of: Boolean,
        required: true
    },
    strategy: {
        type: String,
        enum: Object.values(StrategiesType),
        required: true
    },
    values: [{
        type: String,
        require: true,
        trim: true
    }],
    operation: {
        type: String,
        enum: Object.values(OperationsType),
        require: true
    },
    config: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Config'
    },
    domain: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Domain'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    updatedBy: {
        type: String
    }
}, {
    timestamps: true
});

configStrategySchema.virtual('admin', {
    ref: 'Admin',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});

Object.assign(configStrategySchema.statics, { StrategiesType, OperationsType });

export const ConfigStrategy = mongoose.model('ConfigStrategy', configStrategySchema);