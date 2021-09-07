import { Schema, model } from 'mongoose';

const userTrainingSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    trainingTask: {
        type: Schema.Types.ObjectId,
        ref: 'TrainingTask'
    },
    date: Number,
    status: {
        type: String,
        enum : ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    },
    marks: Number,
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

userTrainingSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const UserTraining = model('UserTraining', userTrainingSchema);

export default UserTraining;
