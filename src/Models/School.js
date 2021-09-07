import { Schema, model } from 'mongoose';

const schoolsSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    region: {
        type: Schema.Types.ObjectId,
        ref: 'State',
        required: true
    },
    country: {
        type: Schema.Types.ObjectId,
        ref: 'Country',
        required: true
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

schoolsSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const School = model('School', schoolsSchema);

export default School;
