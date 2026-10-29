import { supabaseAdmin } from '../supabase/server';
import { hashPassword } from '../auth/jwt';
import { v4 as uuidv4 } from 'uuid';

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  role: 'user' | 'admin' | 'subadmin';
  status: 'active' | 'suspended' | 'pending' | 'inactive';
  kycLevel: number;
  kyc_status: 'pending' | 'verified' | 'rejected';
  kyc_tier: 'none' | 't1' | 't2' | 't3';
  nin?: string;
  bvn?: string;
  identityType?: string;
  idCardPath?: string;
  selfiePath?: string;
  utilityBillPath?: string;
  state?: string;
  lga?: string;
  address?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  rcNumber?: string;
  cacDocumentPath?: string;
  isPayoutEnabled: boolean;
  payoutRequestStatus: 'none' | 'pending' | 'approved' | 'rejected';
  payoutRequestReason?: string;
  payoutSecretKeyHash?: string;
  payoutIpWhitelist: string[];
  payoutDailyLimit: number;
  payoutHourlyLimit: number;
  apiKey?: string;
  liveApiKey?: string;
  testApiKey?: string;
  webhookUrl?: string;
  webhookActive: boolean;
  settlementEnabled: boolean;
  profilePicture?: string;
  transactionPinHash?: string;
  transactionPinSet?: boolean;
  verificationToken?: string;
  isEmailVerified: boolean;
  resetPasswordOtp?: string;
  resetPasswordOtpExpires?: string;
  savedBankDetails?: any;
  payoutAccounts?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface DbWallet {
  id: string;
  userId: string;
  balance: number;
  clearedBalance: number;
  lockedBalance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbVirtualAccount {
  id: string;
  userId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankType: string;
  email: string;
  alias?: string;
  reference?: string;
  status: 'active' | 'inactive' | 'frozen';
  createdAt: string;
  updatedAt: string;
}

export interface DbTransaction {
  id: string;
  walletId?: string;
  userId: string;
  type: 'credit' | 'debit';
  category: 'deposit' | 'transfer' | 'withdrawal' | 'refund' | 'fee' | 'settlement' | 'adjustment';
  amount: number;
  fee: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  customerReference?: string;
  externalRef?: string;
  narration: string;
  status: 'pending' | 'success' | 'failed';
  metadata?: Record<string, any>;
  isCleared: boolean;
  clearedAt?: string;
  flagged?: boolean;
  createdAt: string;
}

export interface DbPayout {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  payrantFee: number;
  totalDebit: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  payoutType: 'internal' | 'external';
  reference: string;
  externalRef?: string;
  idempotencyKey?: string;
  status: 'INITIATED' | 'LOCKED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  failureReason?: string;
  retryCount: number;
  notifyUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// In-Memory store as cache & graceful fallback
class LocalStore {
  users: Map<string, DbUser> = new Map();
  wallets: Map<string, DbWallet> = new Map();
  virtualAccounts: Map<string, DbVirtualAccount> = new Map();
  transactions: Map<string, DbTransaction> = new Map();
  payouts: Map<string, DbPayout> = new Map();
  auditLogs: any[] = [];
  feeRules: any[] = [];
  systemSettings: any = {
    general: { companyName: 'VTStack Systems', supportEmail: 'support@vtstack.ng', currency: 'NGN', timezone: 'Africa/Lagos', maintenanceMode: false },
    notifications: { emailAlerts: true, slackIntegration: false, webhookRetries: 3, dailyReports: true },
    security: { twoFactorAuth: false, sessionTimeout: 30, passwordExpiry: 90, ipWhitelist: '' },
    parentAccount: { accountName: 'VTStack Operations', accountNumber: '9901827364', bankCode: '999992', type: 'PRIMARY', status: 'ACTIVE' },
    globalSettlement: { status: false, weekendSettlementEnabled: false, scheduleType: 'T1', schedulePeriod: 'Daily', settlementAccounts: [] },
    emailConfig: {
      provider: 'resend',
      resendApiKey: process.env.RESEND_API_KEY || '',
      fromEmail: 'VTStack <support@vtstack.ng>',
    },
    payout: { minAmount: 100, vtpayFeePercent: 0.5, bankSettlementFee: 10, bankSettlementThreshold: 1000, payoutTierStep: 2500, payoutTierFeeStep: 25 },
    deposit: { vtpayFeePercent: 1.0, virtualAccountChargePercent: 0.5 },
    kycTierLimits: {
      t1: { dailyWithdrawalLimit: 50000, monthlyWithdrawalLimit: 500000, dailyDepositLimit: 100000, monthlyDepositLimit: 1000000 },
      t2: { dailyWithdrawalLimit: 200000, monthlyWithdrawalLimit: 2000000, dailyDepositLimit: 500000, monthlyDepositLimit: 5000000 },
      t3: { dailyWithdrawalLimit: 1000000, monthlyWithdrawalLimit: 10000000, dailyDepositLimit: 5000000, monthlyDepositLimit: 50000000 },
    }
  };
  helpMessages: any[] = [];
  communications: any[] = [];
  disputes: any[] = [];
  webhooks: any[] = [];
  userNotifications: any[] = [];
  userReadNotificationIds: Map<string, Set<string>> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private async seedDefaultData() {
    // Default admin fallback for initial bootstrapping
    const adminId = '11111111-1111-1111-1111-111111111111';
    const adminUser: DbUser = {
      id: adminId,
      email: 'admin@vtstack.ng',
      passwordHash: '$2a$10$QSv7ztwOYgMkraMRgnxxque7TfNdYkBFW/ObbbY3NThqR45L.r/hG', // password123
      firstName: 'VTStack',
      lastName: 'Admin',
      fullName: 'VTStack Admin',
      phone: '+2348000000000',
      role: 'admin',
      status: 'active',
      kycLevel: 3,
      kyc_status: 'verified',
      kyc_tier: 't3',
      isPayoutEnabled: true,
      payoutRequestStatus: 'approved',
      payoutIpWhitelist: [],
      payoutDailyLimit: 10000000,
      payoutHourlyLimit: 2000000,
      webhookActive: true,
      settlementEnabled: true,
      isEmailVerified: true,
      apiKey: 'vtp_live_admin_98a72b1c8f4d5e6a7b8c',
      liveApiKey: 'vtp_live_admin_98a72b1c8f4d5e6a7b8c',
      testApiKey: 'vtp_test_admin_12a34b5c6d7e8f9a0b1c',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(adminId, adminUser);
  }
}

const store = new LocalStore();

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && !url.includes('placeholder') && key && !key.includes('placeholder'));
};

export const db = {
  // Users
  users: {
    async findById(id: string): Promise<DbUser | null> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', id).maybeSingle();
          if (data && !error) return mapSupabaseUserToDb(data);
          if (error) console.error('[DB:Supabase findById error]:', error.message);
        } catch (e: any) {
          console.error('[DB:Supabase findById exception]:', e.message);
        }
      }
      return store.users.get(id) || null;
    },

    async findByEmail(email: string): Promise<DbUser | null> {
      const normalized = email.toLowerCase().trim();
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('users').select('*').ilike('email', normalized).maybeSingle();
          if (data && !error) return mapSupabaseUserToDb(data);
          if (error) console.error('[DB:Supabase findByEmail error]:', error.message);
        } catch (e: any) {
          console.error('[DB:Supabase findByEmail exception]:', e.message);
        }
      }
      for (const u of store.users.values()) {
        if (u.email.toLowerCase() === normalized) return u;
      }
      return null;
    },

    async findByApiKey(key: string): Promise<DbUser | null> {
      if (!key) return null;
      const cleanKey = key.trim();
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .or(`api_key.eq.${cleanKey},live_api_key.eq.${cleanKey},test_api_key.eq.${cleanKey}`)
            .maybeSingle();
          if (data && !error) return mapSupabaseUserToDb(data);
        } catch (e) {
          // fallback to memory
        }
      }
      for (const u of store.users.values()) {
        if (u.apiKey === cleanKey || u.liveApiKey === cleanKey || u.testApiKey === cleanKey) {
          return u;
        }
      }
      return null;
    },

    async findAdmins(): Promise<DbUser[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabaseAdmin.from('users').select('*').in('role', ['admin', 'subadmin']);
          if (data) return data.map(mapSupabaseUserToDb);
        } catch (e) {}
      }
      return Array.from(store.users.values()).filter(u => u.role === 'admin' || u.role === 'subadmin');
    },

    async findTenants(): Promise<DbUser[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabaseAdmin.from('users').select('*').eq('role', 'user');
          if (data) return data.map(mapSupabaseUserToDb);
        } catch (e) {}
      }
      return Array.from(store.users.values()).filter(u => u.role === 'user');
    },

    async create(userData: Partial<DbUser>): Promise<DbUser> {
      const id = userData.id || uuidv4();
      const now = new Date().toISOString();
      const newUser: DbUser = {
        id,
        email: userData.email!.toLowerCase().trim(),
        passwordHash: userData.passwordHash || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        fullName: userData.fullName || `${userData.firstName} ${userData.lastName}`.trim(),
        phone: userData.phone || '',
        role: userData.role || 'user',
        status: userData.status || 'active',
        kycLevel: userData.kycLevel ?? 0,
        kyc_status: userData.kyc_status || 'pending',
        kyc_tier: userData.kyc_tier || 'none',
        isPayoutEnabled: userData.isPayoutEnabled ?? false,
        payoutRequestStatus: userData.payoutRequestStatus || 'none',
        payoutIpWhitelist: userData.payoutIpWhitelist || [],
        payoutDailyLimit: userData.payoutDailyLimit ?? 500000,
        payoutHourlyLimit: userData.payoutHourlyLimit ?? 100000,
        webhookActive: userData.webhookActive ?? true,
        settlementEnabled: userData.settlementEnabled ?? true,
        isEmailVerified: userData.isEmailVerified ?? false,
        payoutAccounts: userData.payoutAccounts || [],
        createdAt: now,
        updatedAt: now,
        ...userData,
      };

      if (isSupabaseConfigured()) {
        try {
          const sbData = mapDbUserToSupabase(newUser);
          const { error } = await supabaseAdmin.from('users').insert(sbData);
          if (error) {
            console.error('[DB:Supabase Error] Failed to insert user:', error.code, error.message, error.details);
          }
        } catch (e: any) {
          console.error('[DB:Supabase Exception] Failed to insert user:', e.message);
        }
      }
      store.users.set(id, newUser);
      return newUser;
    },

    async update(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
      const user = await this.findById(id);
      if (!user) return null;

      const updated = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        try {
          const sbData = mapDbUserToSupabase(updated);
          const { error } = await supabaseAdmin.from('users').update(sbData).eq('id', id);
          if (error) {
            console.error('[DB:Supabase Error] Failed to update user:', error.code, error.message);
          }
        } catch (e: any) {
          console.error('[DB:Supabase Exception] Failed to update user:', e.message);
        }
      }
      store.users.set(id, updated);
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('users').delete().eq('id', id);
        } catch (e) {}
      }
      return store.users.delete(id);
    }
  },

  // Wallets
  wallets: {
    async findByUserId(userId: string): Promise<DbWallet | null> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('wallets').select('*').eq('user_id', userId).maybeSingle();
          if (data && !error) return mapSupabaseWalletToDb(data);
          if (error) console.error('[DB:Supabase wallet findByUserId error]:', error.message);
        } catch (e: any) {
          console.error('[DB:Supabase wallet findByUserId exception]:', e.message);
        }
      }
      for (const w of store.wallets.values()) {
        if (w.userId === userId) return w;
      }
      return null;
    },

    async create(walletData: Partial<DbWallet>): Promise<DbWallet> {
      const id = walletData.id || uuidv4();
      const now = new Date().toISOString();
      const newWallet: DbWallet = {
        id,
        userId: walletData.userId!,
        balance: walletData.balance ?? 0,
        clearedBalance: walletData.clearedBalance ?? 0,
        lockedBalance: walletData.lockedBalance ?? 0,
        currency: walletData.currency || 'NGN',
        createdAt: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabaseAdmin.from('wallets').insert(mapDbWalletToSupabase(newWallet));
          if (error) {
            console.error('[DB:Supabase Error] Failed to insert wallet:', error.code, error.message);
          }
        } catch (e: any) {
          console.error('[DB:Supabase Exception] Failed to insert wallet:', e.message);
        }
      }
      store.wallets.set(id, newWallet);
      return newWallet;
    },

    async update(id: string, updates: Partial<DbWallet>): Promise<DbWallet | null> {
      const wallet = store.wallets.get(id);
      if (!wallet) return null;

      const updated = {
        ...wallet,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('wallets').update(mapDbWalletToSupabase(updated)).eq('id', id);
        } catch (e) {}
      }
      store.wallets.set(id, updated);
      return updated;
    }
  },

  // Virtual Accounts
  virtualAccounts: {
    async findByUserId(userId: string): Promise<DbVirtualAccount[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabaseAdmin.from('virtual_accounts').select('*').eq('user_id', userId);
          if (data) return data.map(mapSupabaseVirtualAccountToDb);
        } catch (e) {}
      }
      return Array.from(store.virtualAccounts.values()).filter(va => va.userId === userId);
    },

    async findByAccountNumber(accountNumber: string): Promise<DbVirtualAccount | null> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('virtual_accounts').select('*').eq('account_number', accountNumber).maybeSingle();
          if (data && !error) return mapSupabaseVirtualAccountToDb(data);
          if (error) console.error('[DB:Supabase findByAccountNumber error]:', error.message);
        } catch (e: any) {
          console.error('[DB:Supabase findByAccountNumber exception]:', e.message);
        }
      }
      for (const va of store.virtualAccounts.values()) {
        if (va.accountNumber === accountNumber) return va;
      }
      return null;
    },

    async findAll(): Promise<DbVirtualAccount[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabaseAdmin.from('virtual_accounts').select('*');
          if (data) return data.map(mapSupabaseVirtualAccountToDb);
        } catch (e) {}
      }
      return Array.from(store.virtualAccounts.values());
    },

    async create(vaData: Partial<DbVirtualAccount>): Promise<DbVirtualAccount> {
      const id = vaData.id || uuidv4();
      const now = new Date().toISOString();
      const newVA: DbVirtualAccount = {
        id,
        userId: vaData.userId!,
        accountNumber: vaData.accountNumber!,
        accountName: vaData.accountName!,
        bankName: vaData.bankName || 'PalmPay',
        bankType: vaData.bankType || 'palmpay',
        email: vaData.email!,
        alias: vaData.alias,
        reference: vaData.reference,
        status: vaData.status || 'active',
        createdAt: now,
        updatedAt: now,
      };

      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('virtual_accounts').insert(mapDbVirtualAccountToSupabase(newVA));
        } catch (e) {}
      }
      store.virtualAccounts.set(id, newVA);
      return newVA;
    },

    async update(id: string, updates: Partial<DbVirtualAccount>): Promise<DbVirtualAccount | null> {
      const va = store.virtualAccounts.get(id);
      if (!va) return null;
      const updated = { ...va, ...updates, updatedAt: new Date().toISOString() };
      store.virtualAccounts.set(id, updated);
      return updated;
    }
  },

  // Transactions
  transactions: {
    async findByUserId(userId: string): Promise<DbTransaction[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabaseAdmin.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          if (data) return data.map(mapSupabaseTxToDb);
        } catch (e) {}
      }
      return Array.from(store.transactions.values()).filter(t => t.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async findAll(params?: any): Promise<DbTransaction[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabaseAdmin.from('transactions').select('*').order('created_at', { ascending: false });
          if (data) return data.map(mapSupabaseTxToDb);
        } catch (e) {}
      }
      return Array.from(store.transactions.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async findById(id: string): Promise<DbTransaction | null> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('transactions').select('*').eq('id', id).maybeSingle();
          if (data && !error) return mapSupabaseTxToDb(data);
          if (error) console.error('[DB:Supabase tx findById error]:', error.message);
        } catch (e: any) {
          console.error('[DB:Supabase tx findById exception]:', e.message);
        }
      }
      return store.transactions.get(id) || null;
    },

    async create(txData: Partial<DbTransaction>): Promise<DbTransaction> {
      const id = txData.id || uuidv4();
      const now = new Date().toISOString();
      const newTx: DbTransaction = {
        id,
        walletId: txData.walletId,
        userId: txData.userId!,
        type: txData.type!,
        category: txData.category!,
        amount: txData.amount!,
        fee: txData.fee ?? 0,
        balanceBefore: txData.balanceBefore ?? 0,
        balanceAfter: txData.balanceAfter ?? 0,
        reference: txData.reference || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerReference: txData.customerReference,
        externalRef: txData.externalRef,
        narration: txData.narration || 'Transaction',
        status: txData.status || 'success',
        metadata: txData.metadata || {},
        isCleared: txData.isCleared ?? true,
        clearedAt: txData.clearedAt || now,
        flagged: txData.flagged ?? false,
        createdAt: now,
      };

      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('transactions').insert(mapDbTxToSupabase(newTx));
        } catch (e) {}
      }
      store.transactions.set(id, newTx);
      return newTx;
    },

    async update(id: string, updates: Partial<DbTransaction>): Promise<DbTransaction | null> {
      const tx = store.transactions.get(id);
      if (!tx) return null;
      const updated = { ...tx, ...updates };
      store.transactions.set(id, updated);
      return updated;
    }
  },

  // Payouts
  payouts: {
    async findByUserId(userId: string): Promise<DbPayout[]> {
      return Array.from(store.payouts.values()).filter(p => p.userId === userId);
    },

    async findAll(): Promise<DbPayout[]> {
      return Array.from(store.payouts.values());
    },

    async create(payoutData: Partial<DbPayout>): Promise<DbPayout> {
      const id = payoutData.id || uuidv4();
      const now = new Date().toISOString();
      const newPayout: DbPayout = {
        id,
        userId: payoutData.userId!,
        amount: payoutData.amount!,
        fee: payoutData.fee ?? 0,
        payrantFee: payoutData.payrantFee ?? 0,
        totalDebit: payoutData.totalDebit ?? (payoutData.amount! + (payoutData.fee ?? 0)),
        bankCode: payoutData.bankCode!,
        accountNumber: payoutData.accountNumber!,
        accountName: payoutData.accountName!,
        payoutType: payoutData.payoutType || 'external',
        reference: payoutData.reference || `PO-${Date.now()}`,
        status: payoutData.status || 'SUCCESS',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      store.payouts.set(id, newPayout);
      return newPayout;
    }
  },

  // Audit Logs
  auditLogs: {
    async create(log: any) {
      const newLog = { id: uuidv4(), createdAt: new Date().toISOString(), ...log };
      store.auditLogs.unshift(newLog);
      return newLog;
    },
    async findAll(params?: any) {
      return store.auditLogs;
    }
  },

  // System Settings
  systemSettings: {
    async get() {
      return store.systemSettings;
    },
    async update(updates: any) {
      store.systemSettings = { ...store.systemSettings, ...updates };
      return store.systemSettings;
    }
  },

  // Fees
  fees: {
    async findAll() {
      return store.feeRules;
    },
    async create(data: any) {
      const fee = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
      store.feeRules.push(fee);
      return fee;
    },
    async update(id: string, data: any) {
      const idx = store.feeRules.findIndex(f => f.id === id);
      if (idx !== -1) {
        store.feeRules[idx] = { ...store.feeRules[idx], ...data };
        return store.feeRules[idx];
      }
      return null;
    },
    async delete(id: string) {
      store.feeRules = store.feeRules.filter(f => f.id !== id);
      return true;
    }
  },

  // Help Messages
  help: {
    async findAll() {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('help_messages').select('*').order('created_at', { ascending: false });
          if (data && !error) {
            return data.map((m: any) => ({
              id: m.id,
              _id: m.id,
              userId: m.user_id,
              subject: m.subject,
              message: m.message,
              status: m.status,
              adminNotes: m.admin_notes,
              createdAt: m.created_at,
              updatedAt: m.updated_at,
            }));
          }
        } catch (e: any) {
          console.error('[DB:Supabase Error] help.findAll:', e.message);
        }
      }
      return store.helpMessages;
    },

    async findByUserId(userId: string) {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('help_messages').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          if (data && !error) {
            return data.map((m: any) => ({
              id: m.id,
              _id: m.id,
              userId: m.user_id,
              subject: m.subject,
              message: m.message,
              status: m.status,
              adminNotes: m.admin_notes,
              createdAt: m.created_at,
              updatedAt: m.updated_at,
            }));
          }
        } catch (e: any) {
          console.error('[DB:Supabase Error] help.findByUserId:', e.message);
        }
      }
      return store.helpMessages.filter((m: any) => m.userId === userId);
    },

    async create(data: any) {
      const id = data.id || uuidv4();
      const now = new Date().toISOString();
      const item = { id, _id: id, status: data.status || 'pending', createdAt: now, updatedAt: now, ...data };
      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('help_messages').insert({
            id,
            user_id: data.userId || null,
            subject: data.subject,
            message: data.message,
            status: data.status || 'open',
            admin_notes: data.adminNotes || null,
            created_at: now,
            updated_at: now,
          });
        } catch (e: any) {
          console.error('[DB:Supabase Error] Failed to insert help message:', e.message);
        }
      }
      store.helpMessages.unshift(item);
      return item;
    },

    async updateStatus(id: string, status: string, adminNotes?: string) {
      if (isSupabaseConfigured()) {
        try {
          const updatePayload: any = { status, updated_at: new Date().toISOString() };
          if (adminNotes !== undefined) updatePayload.admin_notes = adminNotes;
          await supabaseAdmin.from('help_messages').update(updatePayload).eq('id', id);
        } catch (e: any) {
          console.error('[DB:Supabase Error] Failed to update help message status:', e.message);
        }
      }
      const item = store.helpMessages.find(m => m.id === id);
      if (item) {
        item.status = status;
        if (adminNotes !== undefined) item.adminNotes = adminNotes;
        item.updatedAt = new Date().toISOString();
        return item;
      }
      return null;
    }
  },

  // Communications
  communications: {
    async findAll() {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('communications').select('*').order('created_at', { ascending: false });
          if (data && !error) {
            return data.map((c: any) => ({
              id: c.id,
              _id: c.id,
              userId: c.recipient_id || c.sender_id,
              recipientId: c.recipient_id,
              senderId: c.sender_id,
              subject: c.subject,
              message: c.message,
              type: c.type,
              status: c.status,
              createdAt: c.created_at,
            }));
          }
        } catch (e: any) {
          console.error('[DB:Supabase Error] communications.findAll:', e.message);
        }
      }
      return store.communications;
    },

    async findByUserId(userId: string) {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin.from('communications').select('*').or(`recipient_id.eq.${userId},sender_id.eq.${userId}`).order('created_at', { ascending: false });
          if (data && !error) {
            return data.map((c: any) => ({
              id: c.id,
              _id: c.id,
              userId: c.recipient_id || c.sender_id,
              recipientId: c.recipient_id,
              senderId: c.sender_id,
              subject: c.subject,
              message: c.message,
              type: c.type,
              status: c.status,
              createdAt: c.created_at,
            }));
          }
        } catch (e: any) {
          console.error('[DB:Supabase Error] communications.findByUserId:', e.message);
        }
      }
      return store.communications.filter((c: any) => c.userId === userId || c.recipientId === userId);
    },

    async create(data: any) {
      const id = data.id || uuidv4();
      const now = new Date().toISOString();
      const item = { id, _id: id, createdAt: now, ...data };
      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('communications').insert({
            id,
            sender_id: data.senderId || null,
            recipient_id: data.recipientId || data.userId || null,
            subject: data.subject,
            message: data.message,
            type: data.type || 'email',
            status: data.status || 'sent',
            created_at: now,
          });
        } catch (e: any) {
          console.error('[DB:Supabase Error] Failed to insert communication:', e.message);
        }
      }
      store.communications.unshift(item);
      return item;
    }
  },

  // Webhook Logs
  webhooks: {
    async findAll() {
      return store.webhooks;
    },
    async create(data: any) {
      const item = { id: uuidv4(), createdAt: new Date().toISOString(), ...data };
      store.webhooks.unshift(item);
      return item;
    }
  },

  // User Notifications
  notifications: {
    async findByUserId(userId: string) {
      let readSet = store.userReadNotificationIds.get(userId);
      if (!readSet) {
        readSet = new Set<string>();
        store.userReadNotificationIds.set(userId, readSet);
      }

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .or(`user_id.eq.${userId},user_id.is.null,user_id.eq.all`)
            .order('created_at', { ascending: false });

          if (data && !error && data.length > 0) {
            return data.map((n: any) => ({
              id: n.id,
              _id: n.id,
              userId: n.user_id,
              title: n.title,
              message: n.message,
              type: n.type || 'system',
              isRead: Boolean(n.is_read || n.read || readSet?.has(n.id)),
              read: Boolean(n.is_read || n.read || readSet?.has(n.id)),
              link: n.link,
              createdAt: n.created_at,
            }));
          }
        } catch (e: any) {
          // fallback to memory
        }
      }

      return store.userNotifications
        .filter((n: any) => !n.userId || n.userId === 'all' || n.userId === userId)
        .map((n: any) => ({
          ...n,
          isRead: Boolean(n.isRead || n.read || readSet?.has(n.id) || readSet?.has(n._id)),
          read: Boolean(n.isRead || n.read || readSet?.has(n.id) || readSet?.has(n._id)),
        }));
    },

    async create(data: any) {
      const id = data.id || uuidv4();
      const now = new Date().toISOString();
      const item = {
        id,
        _id: id,
        userId: data.userId || null,
        title: data.title,
        message: data.message,
        type: data.type || 'system',
        isRead: Boolean(data.isRead ?? data.read ?? false),
        read: Boolean(data.isRead ?? data.read ?? false),
        link: data.link || null,
        createdAt: data.createdAt || now,
      };

      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('notifications').insert({
            id,
            user_id: item.userId,
            title: item.title,
            message: item.message,
            type: item.type,
            is_read: item.isRead,
            link: item.link,
            created_at: item.createdAt,
          });
        } catch (e: any) {
          // fallback to memory
        }
      }

      store.userNotifications.unshift(item);
      return item;
    },

    async markAsRead(id: string, userId: string) {
      let readSet = store.userReadNotificationIds.get(userId);
      if (!readSet) {
        readSet = new Set<string>();
        store.userReadNotificationIds.set(userId, readSet);
      }
      readSet.add(id);

      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('notifications').update({ is_read: true }).eq('id', id);
        } catch (e: any) {}
      }

      const item = store.userNotifications.find((n: any) => (n.id === id || n._id === id));
      if (item) {
        item.isRead = true;
        item.read = true;
      }
      return true;
    },

    async markAllAsRead(userId: string) {
      let readSet = store.userReadNotificationIds.get(userId);
      if (!readSet) {
        readSet = new Set<string>();
        store.userReadNotificationIds.set(userId, readSet);
      }

      store.userNotifications.forEach((n: any) => {
        if (!n.userId || n.userId === 'all' || n.userId === userId) {
          n.isRead = true;
          n.read = true;
          readSet?.add(n.id || n._id);
        }
      });

      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('notifications').update({ is_read: true }).or(`user_id.eq.${userId},user_id.is.null,user_id.eq.all`);
        } catch (e: any) {}
      }

      return true;
    }
  }
};

// Data mappers between Supabase snake_case and DB camelCase
function mapSupabaseUserToDb(data: any): DbUser {
  return {
    id: data.id,
    email: data.email,
    passwordHash: data.password_hash,
    firstName: data.first_name,
    lastName: data.last_name,
    fullName: data.full_name,
    phone: data.phone,
    role: data.role,
    status: data.status,
    kycLevel: data.kyc_level,
    kyc_status: data.kyc_status,
    kyc_tier: data.kyc_tier,
    nin: data.nin,
    bvn: data.bvn,
    identityType: data.identity_type,
    idCardPath: data.id_card_path,
    selfiePath: data.selfie_path,
    utilityBillPath: data.utility_bill_path,
    state: data.state,
    lga: data.lga,
    address: data.address,
    businessName: data.business_name,
    businessAddress: data.business_address,
    businessPhone: data.business_phone,
    rcNumber: data.rc_number,
    cacDocumentPath: data.cac_document_path,
    isPayoutEnabled: data.is_payout_enabled,
    payoutRequestStatus: data.payout_request_status,
    payoutRequestReason: data.payout_request_reason,
    payoutSecretKeyHash: data.payout_secret_key_hash,
    payoutIpWhitelist: data.payout_ip_whitelist || [],
    payoutDailyLimit: Number(data.payout_daily_limit || 500000),
    payoutHourlyLimit: Number(data.payout_hourly_limit || 100000),
    apiKey: data.api_key,
    liveApiKey: data.live_api_key,
    testApiKey: data.test_api_key,
    webhookUrl: data.webhook_url,
    webhookActive: data.webhook_active,
    settlementEnabled: data.settlement_enabled,
    profilePicture: data.profile_picture,
    transactionPinHash: data.transaction_pin_hash,
    transactionPinSet: Boolean(data.transaction_pin_hash),
    verificationToken: data.verification_token,
    isEmailVerified: data.is_email_verified,
    resetPasswordOtp: data.reset_password_otp,
    resetPasswordOtpExpires: data.reset_password_otp_expires,
    savedBankDetails: data.saved_bank_details,
    payoutAccounts: data.payout_accounts || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapDbUserToSupabase(user: DbUser): any {
  return {
    id: user.id,
    email: user.email,
    password_hash: user.passwordHash,
    first_name: user.firstName,
    last_name: user.lastName,
    full_name: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    kyc_level: user.kycLevel,
    kyc_status: user.kyc_status,
    kyc_tier: user.kyc_tier,
    nin: user.nin,
    bvn: user.bvn,
    identity_type: user.identityType,
    id_card_path: user.idCardPath,
    selfie_path: user.selfiePath,
    utility_bill_path: user.utilityBillPath,
    state: user.state,
    lga: user.lga,
    address: user.address,
    business_name: user.businessName,
    business_address: user.businessAddress,
    business_phone: user.businessPhone,
    rc_number: user.rcNumber,
    cac_document_path: user.cacDocumentPath,
    is_payout_enabled: user.isPayoutEnabled,
    payout_request_status: user.payoutRequestStatus,
    payout_request_reason: user.payoutRequestReason,
    payout_secret_key_hash: user.payoutSecretKeyHash,
    payout_ip_whitelist: user.payoutIpWhitelist,
    payout_daily_limit: user.payoutDailyLimit,
    payout_hourly_limit: user.payoutHourlyLimit,
    api_key: user.apiKey,
    live_api_key: user.liveApiKey,
    test_api_key: user.testApiKey,
    webhook_url: user.webhookUrl,
    webhook_active: user.webhookActive,
    settlement_enabled: user.settlementEnabled,
    profile_picture: user.profilePicture,
    transaction_pin_hash: user.transactionPinHash,
    verification_token: user.verificationToken,
    is_email_verified: user.isEmailVerified,
    reset_password_otp: user.resetPasswordOtp,
    reset_password_otp_expires: user.resetPasswordOtpExpires,
    saved_bank_details: user.savedBankDetails,
    payout_accounts: user.payoutAccounts,
    updated_at: user.updatedAt,
  };
}

function mapSupabaseWalletToDb(data: any): DbWallet {
  return {
    id: data.id,
    userId: data.user_id,
    balance: Number(data.balance || 0),
    clearedBalance: Number(data.cleared_balance || 0),
    lockedBalance: Number(data.locked_balance || 0),
    currency: data.currency || 'NGN',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapDbWalletToSupabase(w: DbWallet): any {
  return {
    id: w.id,
    user_id: w.userId,
    balance: w.balance,
    cleared_balance: w.clearedBalance,
    locked_balance: w.lockedBalance,
    currency: w.currency,
  };
}

function mapSupabaseVirtualAccountToDb(data: any): DbVirtualAccount {
  return {
    id: data.id,
    userId: data.user_id,
    accountNumber: data.account_number,
    accountName: data.account_name,
    bankName: data.bank_name,
    bankType: data.bank_type,
    email: data.email,
    alias: data.alias,
    reference: data.reference,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapDbVirtualAccountToSupabase(va: DbVirtualAccount): any {
  return {
    id: va.id,
    user_id: va.userId,
    account_number: va.accountNumber,
    account_name: va.accountName,
    bank_name: va.bankName,
    bank_type: va.bankType,
    email: va.email,
    alias: va.alias,
    reference: va.reference,
    status: va.status,
  };
}

function mapSupabaseTxToDb(data: any): DbTransaction {
  return {
    id: data.id,
    walletId: data.wallet_id,
    userId: data.user_id,
    type: data.type,
    category: data.category,
    amount: Number(data.amount || 0),
    fee: Number(data.fee || 0),
    balanceBefore: Number(data.balance_before || 0),
    balanceAfter: Number(data.balance_after || 0),
    reference: data.reference,
    customerReference: data.customer_reference,
    externalRef: data.external_ref,
    narration: data.narration,
    status: data.status,
    metadata: data.metadata,
    isCleared: data.is_cleared,
    clearedAt: data.cleared_at,
    flagged: data.flagged,
    createdAt: data.created_at,
  };
}

function mapDbTxToSupabase(tx: DbTransaction): any {
  return {
    id: tx.id,
    wallet_id: tx.walletId,
    user_id: tx.userId,
    type: tx.type,
    category: tx.category,
    amount: tx.amount,
    fee: tx.fee,
    balance_before: tx.balanceBefore,
    balance_after: tx.balanceAfter,
    reference: tx.reference,
    customer_reference: tx.customerReference,
    external_ref: tx.externalRef,
    narration: tx.narration,
    status: tx.status,
    metadata: tx.metadata,
    is_cleared: tx.isCleared,
    cleared_at: tx.clearedAt,
    flagged: tx.flagged,
  };
}

export default db;
