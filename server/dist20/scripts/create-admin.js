"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const models_1 = require("../models");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const createAdmin = async () => {
    try {
        await (0, database_1.connectDatabase)();
        console.log('✅ Connected to database');
        // Admin credentials
        const adminEmail = 'aminuamee@yahoo.com';
        const adminPassword = 'Robot@net.1-5';
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
        // Check if admin already exists
        const existingAdmin = await models_1.User.findOne({ email: adminEmail });
        if (existingAdmin) {
            existingAdmin.passwordHash = hashedPassword;
            existingAdmin.role = 'admin';
            existingAdmin.status = 'active';
            existingAdmin.kyc_status = 'verified';
            existingAdmin.kycLevel = 3;
            await existingAdmin.save();
            console.log('✅ Admin user updated successfully with new credentials!');
        }
        else {
            // Create admin user
            await models_1.User.create({
                email: adminEmail,
                passwordHash: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
                phone: '+2348000000000',
                role: 'admin',
                status: 'active',
                kyc_status: 'verified',
                kycLevel: 3,
                businessName: 'VTStack Admin',
            });
            console.log('✅ Admin user created successfully!');
        }
        console.log('');
        console.log('=================================');
        console.log('Admin Login Credentials:');
        console.log('=================================');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('=================================');
        console.log('');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
};
createAdmin();
//# sourceMappingURL=create-admin.js.map