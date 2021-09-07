import { Schema, model } from 'mongoose';

const trainingResultSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    trainings: [{
        type: Schema.Types.ObjectId,
        ref: 'UserTraining'
    }],
    date: Number,
    attempt: {
        type: Number,
        required: true
    },
    rating: {
        type: String,
        enum : ['Reliable', 'Unreliable'],
        default: 'Unreliable'
    },
    status: {
        type: String,
        enum : ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    },
    nextTrainingDate: Number,
    marks: Number,
    testId: String,
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

trainingResultSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const TrainingResult = model('TrainingResult', trainingResultSchema);

export default TrainingResult;
