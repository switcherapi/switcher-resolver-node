import mongoose from 'mongoose';
import { EnvType } from './environment';

const domainSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5,
        maxlength: 30
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
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    integrations: {
        slack: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Slack'
        },
        relay: {
            verification_code: {
                type: String
            }
        }
    },
    lastUpdate: {
        type: Number,
        default: Date.now()
    },
    updatedBy: {
        type: String
    },
    transfer: {
        type: Boolean
    }
}, {
    timestamps: true
});

domainSchema.virtual('admin', {
    ref: 'Admin',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});

domainSchema.virtual('groupConfig', {
    ref: 'GroupConfig',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.virtual('config', {
    ref: 'Config',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.virtual('configStrategy', {
    ref: 'ConfigStrategy',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.virtual('environment', {
    ref: 'Environment',
    localField: '_id',
    foreignField: 'domain'
});

domainSchema.virtual('team', {
    ref: 'Team',
    localField: '_id',
    foreignField: 'domain'
});

const Domain = mongoose.model('Domain', domainSchema);

export default Domain;