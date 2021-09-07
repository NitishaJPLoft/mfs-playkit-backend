import { Schema, model } from 'mongoose';

const studentSchema = new Schema({
    firstName: {
        type: String,
        required: true,
        index: true
    },
    lastName: {
        type: String,
        required: true,
        index: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female']
    },
    dob: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    class: {
        type: Schema.Types.ObjectId,
        ref: 'Class'
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

studentSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        ret.fullName = ret.firstName + ' ' + ret.lastName;
        delete ret.__v;
        return ret;
    },
});

const Student = model('Student', studentSchema);

export default Student;
