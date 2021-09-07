import { Schema, model } from 'mongoose';

export const trainingTaskSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    language: {
        type: Schema.Types.ObjectId,
        ref: 'Language',
        required: true
    },
    publishDate: {
        type: Number,
        required: true
    },
    task: {
        type: Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    video: String,
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

trainingTaskSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const TrainingTask = model('TrainingTask', trainingTaskSchema);

export default TrainingTask;
