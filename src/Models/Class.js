import { Schema, model } from 'mongoose';

const classesSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        index: true,
        default: 'active'
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'School'
    },
    practitioner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdIp: {
        type: String,
        required: true,
    },
    updatedIp: {
        type: String,
        required: true,
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

classesSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const Class = model('Class', classesSchema);

export default Class;
