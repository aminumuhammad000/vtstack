import { connectDatabase } from '../config/database';
import { User, Wallet } from '../models';
import bcrypt from 'bcryptjs';

const createOrUpdateAdmin = async () => {
    try {
        await connectDatabase();
        console.log('✅ Connected to database');

        // Allow passing arguments: npx tsx src/scripts/create-admin.ts [email] [password] [firstName] [lastName] [phone] [role]
        const args = process.argv.slice(2);
        const adminEmail = (args[0] || process.env.ADMIN_EMAIL || 'aminuamee@yahoo.com').toLowerCase().trim();
        const adminPassword = args[1] || process.env.ADMIN_PASSWORD || 'Robot@net.1-5';
        const firstName = (args[2] || 'Admin').trim();
        const lastName = (args[3] || 'User').trim();
        const phone = (args[4] || '+2348000000000').trim();
        const role = args[5] === 'subadmin' ? 'subadmin' : 'admin';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Check if admin already exists
        let admin = await User.findOne({ email: adminEmail });
        if (admin) {
            admin.passwordHash = hashedPassword;
            admin.role = role;
            admin.status = 'active';
            admin.kyc_status = 'verified';
            admin.kycLevel = 3;
            if (args[2]) admin.firstName = firstName;
            if (args[3]) admin.lastName = lastName;
            admin.fullName = `${admin.firstName || firstName} ${admin.lastName || lastName}`.trim();
            if (args[4]) admin.phone = phone;
            await admin.save();

            console.log(`✅ Admin user (${adminEmail}) updated successfully with new credentials!`);
        } else {
            // Create admin user
            admin = await User.create({
                email: adminEmail,
                passwordHash: hashedPassword,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`,
                phone,
                role,
                status: 'active',
                kyc_status: 'verified',
                kycLevel: 3,
                businessName: 'VTStack Admin',
            });

            console.log(`✅ Admin user (${adminEmail}) created successfully!`);
        }

        // Ensure wallet exists for admin
        try {
            const existingWallet = await Wallet.findOne({ userId: admin._id });
            if (!existingWallet) {
                await Wallet.create({
                    userId: admin._id,
                    balance: 0,
                    clearedBalance: 0,
                    lockedBalance: 0,
                    currency: 'NGN',
                });
            }
        } catch (wErr) {
            console.warn('Note: Admin wallet creation note:', wErr);
        }

        console.log('');
        console.log('=================================');
        console.log('Admin Account Details:');
        console.log('=================================');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('Role:', role);
        console.log('Name:', `${admin.firstName} ${admin.lastName}`);
        console.log('Status:', admin.status);
        console.log('=================================');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating/updating admin:', error);
        process.exit(1);
    }
};

createOrUpdateAdmin();
