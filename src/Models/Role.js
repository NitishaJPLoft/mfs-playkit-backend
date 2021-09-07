import { Schema, model } from 'mongoose';

const roleSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    displayName: String,
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

roleSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const Role = model('Role', roleSchema);

export default Role;
