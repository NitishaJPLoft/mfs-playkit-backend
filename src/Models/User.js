import { Schema, model } from 'mongoose';

export const userSchema = new Schema({
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
    email: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    password: String,
    school: [{
        type: Schema.Types.ObjectId,
        ref: 'School'
    }],
    region: [{
        type: Schema.Types.ObjectId,
        ref: 'State'
    }],
    country: [{
        type: Schema.Types.ObjectId,
        ref: 'Country'
    }],
    role: {
        type: Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    firstLoggedIn: {
        type: Boolean,
        default: false
    },
    language: String,
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
}, { timestamps: true, collection: 'users' });

userSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        ret.fullName = ret.firstName + ' ' + ret.lastName;
        delete ret.__v;
        return ret;
    }
});

const User = model('User', userSchema);

export default User;
