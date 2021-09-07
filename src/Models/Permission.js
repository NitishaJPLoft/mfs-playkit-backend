import { Schema, model } from 'mongoose';

const permissionSchema = new Schema({
    role: {
        type: Schema.Types.ObjectId,
        ref: 'Role'
    },
    module: {
        type: String,
        required: true,
    },
    permissions: [{
        name: String,
        value: Boolean,
        subPermissions: {}
    }],
    createdIp: {
        type: String,
        required: true,
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

permissionSchema.set('toJSON', {
    transform: (doc, ret, opt) => {
        delete ret.__v;
        return ret;
    },
});

const Permission = model('Permission', permissionSchema);

export default Permission;
