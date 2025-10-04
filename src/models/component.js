import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import Domain from './domain.js';

export const EncryptionSalts = Object.freeze({
    COMPONENT: 8
});

const componentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
        minlength: 2
    },
    description: {
        type: String,
        trim: true,
        maxlength: 256
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
    apihash: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

componentSchema.methods.generateApiKey = async function () {
    const apiKey = randomUUID();
    const hash = await bcryptjs.hash(apiKey, EncryptionSalts.COMPONENT);
    this.apihash = hash;
    await this.save();
    
    return apiKey;
};

componentSchema.methods.generateAuthToken = async function (environment, rate_limit) {
    const options = {
        expiresIn: process.env.JWT_CLIENT_TOKEN_EXP_TIME
    };

    return jwt.sign(({ 
        component: this._id,
        environment,
        rate_limit,
        vc: this.apihash.substring(50, this.apihash.length - 1) 
    }), process.env.JWT_SECRET, options);
};

componentSchema.statics.findByCredentials = async (domainName, componentName, apiKey) => {
    const domain = await Domain.findOne({ name: domainName }).exec();
    const component = await Component.findOne({ name: componentName, domain: domain._id || '' }).exec();

    if (!component) {
        throw new Error('Unable to find this Component');
    }

    const isMatch = await bcryptjs.compare(apiKey, component.apihash);
    
    if (!isMatch) {
        throw new Error('Unable to find this Component');
    }

    return {
        component,
        domain
    };
};

const Component = mongoose.model('Component', componentSchema);

export default Component;