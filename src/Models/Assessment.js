import { Schema, model } from 'mongoose';

export const assessmentSchema = new Schema({
    class: {
        type: Schema.Types.ObjectId,
        ref: 'Class'
    },
    task: {
        type: Schema.Types.ObjectId,
        ref: 'Task'
    },
    practitioner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'Student'
    },
    head: {
        type: Number,
        required: true
    },
    arms: {
        type: Number,
        required: true
    },
    legs: {
        type: Number,
        required: true
    },
    body: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now()
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
    }
}, { timestamps: true});

assessmentSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const Assessment = model('Assessment', assessmentSchema);

export default Assessment;
