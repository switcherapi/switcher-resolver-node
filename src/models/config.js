import mongoose from 'mongoose';
import { EnvType } from './environment.js';

export const RelayMethods = Object.freeze({
    POST: 'POST',
    GET: 'GET'
});

export const RelayTypes = Object.freeze({
    VALIDATION: 'VALIDATION',
    NOTIFICATION: 'NOTIFICATION'
});

export const StrategiesToRelayDataType = Object.freeze({
    NETWORK_VALIDATION: 'network',
    VALUE_VALIDATION: 'value',
    NUMERIC_VALIDATION: 'numeric',
    TIME_VALIDATION: 'time',
    DATE_VALIDATION: 'date',
    REGEX_VALIDATION: 'regex',
    PAYLOAD_VALIDATION: 'payload'
});

const configSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
        minlength: 3
    },
    description: {
        type: String,
        trim: true,
        maxlength: 256
    },
    activated: {
        type: Map,
        of: Boolean,
        required: true,
        default: new Map().set(EnvType.DEFAULT, true)
    },
    components: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    group: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'GroupConfig'
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
    disable_metrics: {
        type: Map,
        of: Boolean
    },
    updatedBy: {
        type: String
    },
    relay: {
        type: {
            type: String,
            enum: Object.values(RelayTypes)
        },
        description: {
            type: String,
            maxlength: 256
        },
        activated: {
            type: Map,
            of: Boolean
        },
        endpoint: {
            type: Map,
            of: String
        },
        method: {
            type: String,
            enum: Object.values(RelayMethods)
        },
        auth_prefix: {
            type: String
        },
        auth_token: {
            type: Map,
            of: String
        },
        verified: {
            type: Map,
            of: Boolean,
            default: new Map()
        }
    }
}, {
    timestamps: true
});

configSchema.index({ key: 1 });

configSchema.virtual('admin', {
    ref: 'Admin',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});

configSchema.virtual('component_list', {
    ref: 'Component',
    localField: 'components',
    foreignField: '_id'
});

export const Config = mongoose.model('Config', configSchema);

export function relayOptions() {
    return {
        methods: Object.values(RelayMethods),
        types: Object.values(RelayTypes)
    };
}