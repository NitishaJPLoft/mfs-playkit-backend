import { Schema, model } from 'mongoose';

const statesSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    country: {
        type: Schema.Types.ObjectId,
        ref: 'Country'
    },
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

statesSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const State = model('State', statesSchema);

export default State;
