import mongoose from 'mongoose';

export const EnvType = Object.freeze({
    DEFAULT: 'default'
});

const environmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        default: EnvType.DEFAULT,
        maxlength: 30,
        minlength: 2
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
    }
}, {
    timestamps: true
});

export const Environment = mongoose.model('Environment', environmentSchema);