import mongoose from 'mongoose';
import { EnvType } from '../models/environment';

const groupConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
        minlength: 2
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

groupConfigSchema.virtual('admin', {
    ref: 'Admin',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});

groupConfigSchema.virtual('config', {
    ref: 'Config',
    localField: '_id',
    foreignField: 'group'
});

const GroupConfig = mongoose.model('GroupConfig', groupConfigSchema);

export default GroupConfig;