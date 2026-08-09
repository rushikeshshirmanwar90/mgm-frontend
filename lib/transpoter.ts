import nodemailer from "nodemailer";

// Lazy load transporter to ensure env vars are loaded
let transporterInstance: any = null;

// Create transporter with multiple fallback configurations
const createEmailTransporter = () => {
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
    const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;

    // Log for debugging
    console.log('📧 Creating email transporter...');
    console.log('   SMTP_HOST:', SMTP_HOST);
    console.log('   SMTP_PORT:', SMTP_PORT);
    console.log('   SMTP_USER:', SMTP_USER || '❌ NOT SET');
    console.log('   SMTP_PASS:', SMTP_PASS ? '✅ SET' : '❌ NOT SET');

    // Validate credentials
    if (!SMTP_USER || !SMTP_PASS) {
        const error = new Error(
            '❌ SMTP credentials not configured!\n' +
            'Please set SMTP_USER and SMTP_PASS environment variables.\n' +
            `Current values: SMTP_USER=${SMTP_USER || 'undefined'}, SMTP_PASS=${SMTP_PASS ? 'set' : 'undefined'}`
        );
        console.error(error.message);
        throw error;
    }

    // Primary configuration with SSL certificate handling
    const primaryConfig = {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
        // TLS configuration to handle self-signed certificate issues
        tls: {
            // Don't fail on invalid/self-signed certificates
            rejectUnauthorized: false,
            // Allow insecure connections for development
            ciphers: 'SSLv3',
            // Ignore certificate errors
            checkServerIdentity: () => undefined,
        },
        // Connection timeout settings
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        // Ignore TLS errors
        ignoreTLS: false,
        requireTLS: false,
    };

    console.log('✅ Email transporter configured successfully');

    return nodemailer.createTransport(primaryConfig);
};

// Export a getter function to lazy load the transporter
export const getTransporter = () => {
    if (!transporterInstance) {
        transporterInstance = createEmailTransporter();
    }
    return transporterInstance;
};

// For backward compatibility - lazy load on first use
export const transporter = {
    sendMail: (...args: any[]) => getTransporter().sendMail(...args),
    verify: (...args: any[]) => getTransporter().verify(...args),
};
