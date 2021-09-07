import { Schema, model } from 'mongoose';

const countriesSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    code: String,
    phoneCode: String,
    isAdded: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdIp: {
        type: String,
        required: true
    },
    updatedIp: {
        type: String,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
}, { timestamps: true });

countriesSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const Country = model('Country', countriesSchema);

export default Country;
