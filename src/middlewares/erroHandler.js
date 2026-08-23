/*
 * @file               user/src/middleware/errorHandler.js
 * @author             Dheeraj Mathur <dheeraj.mathur@naapbooks.com>
 * @createTime         2025-04-25 17:35:45
 * @modifiedAuthor     deepster1106 <deep.s@naapbooks.com>
 * @lastModified       2025-09-22 18:02:36
*/

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

class DataTypeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DataTypeError';
        this.statusCode = 400;
    }
}

const errorHandler = (err, req, res, next) => {
    const logId = getNextLogId();
    logger.error('Error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorType = err.name || 'UnknownError';
    let errorCode = err.code || 'INTERNAL_ERROR';
    let details = {};

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                statusCode = 400;
                message = 'Duplicate entry found';
                errorCode = 'UNIQUE_VIOLATION';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Referenced record not found';
                errorCode = 'FOREIGN_KEY_VIOLATION';
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Record not found';
                errorCode = 'NOT_FOUND';
                break;
            default:
                statusCode = 500;
                message = 'Database error occurred';
                errorCode = 'DATABASE_ERROR';
        }
        details = {
            code: err.code,
            meta: err.meta
        };
    } else if (err instanceof ValidationError) {
        statusCode = 400;
        errorType = 'ValidationError';
        errorCode = 'VALIDATION_ERROR';
    } else if (err instanceof DataTypeError) {
        statusCode = 400;
        errorType = 'DataTypeError';
        errorCode = 'INVALID_DATA_TYPE';
    } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            message: 'Invalid JSON in request body'
        });
    }

    const environment = process.env.NODE_ENV.toUpperCase() || 'LOCAL';
    const isOperational = err.isOperational === true;
    const shouldNotify = (statusCode >= 500 || !isOperational) && (environment.toUpperCase() !== 'DEVELOPMENT' && environment.toUpperCase() !== 'LOCAL');
    console.log("zsdas", statusCode >= 500 || !isOperational);
    console.log("zsdasGGGGG", environment.toUpperCase() !== 'DEVELOPMENT' && environment.toUpperCase() !== 'LOCAL');
    console.log("rrrrrrrrr",isOperational);
    
    process.exit()
    const staticMessage = `An error has occurred. Please contact our support team at support@naapbooks.in with your error Log ID: "${logId}".`;

    if (statusCode >= 500 || (err instanceof Prisma.PrismaClientKnownRequestError && err.code !== 'P2002') || (err instanceof Prisma.PrismaClientKnownRequestError && err.code !== 'P2025') || (errorType && errorType.toLowerCase().includes('prisma'))) {
        message = staticMessage;
    }


    if (shouldNotify) {
        // Fire-and-forget email to support (do not block response)
        (async () => {
            try {
                const serviceName = process.env.SERVICE_NAME || 'user-service';
                const host = req.headers['host'];
                const requestId = req.headers['x-request-id'];
                const userAgent = req.headers['user-agent'];
                const ip = req.ip;
                const occurredAt = new Date().toISOString();

                const html = `
                    <div style="font-family:Arial,Helvetica,sans-serif;">
                      <h2 style="margin:0 0 8px 0;">${serviceName} - ${environment.toUpperCase()} Critical Exception</h2>
                      <p style="margin:0 0 12px 0;">A critical exception occurred.</p>

                      <h3 style="margin:16px 0 8px 0;">Summary</h3>
                      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;background:#fafafa;">
                        <tr><td><b>Message</b></td><td>${escapeHtml(message)}</td></tr>
                        <tr><td><b>Status</b></td><td>${statusCode}</td></tr>
                        <tr><td><b>Log Id</b></td><td>${logId}</td></tr>
                        <tr><td><b>Type</b></td><td>${errorType}</td></tr>
                        <tr><td><b>Code</b></td><td>${errorCode}</td></tr>
                        <tr><td><b>Occurred At</b></td><td>${occurredAt}</td></tr>
                      </table>

                      <h3 style="margin:16px 0 8px 0;">Request</h3>
                      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;background:#fafafa;">
                        <tr><td><b>Method</b></td><td>${req.method}</td></tr>
                        <tr><td><b>URL</b></td><td>${req.originalUrl}</td></tr>
                        <tr><td><b>Host</b></td><td>${host || ''}</td></tr>
                        <tr><td><b>IP</b></td><td>${ip || ''}</td></tr>
                        <tr><td><b>User-Agent</b></td><td>${escapeHtml(userAgent || '')}</td></tr>
                        <tr><td><b>Request ID</b></td><td>${escapeHtml(requestId || '')}</td></tr>
                      </table>

                      <h3 style="margin:16px 0 8px 0;">Headers</h3>
                      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:8px;border:1px solid #eee;">${escapeHtml(JSON.stringify(req.headers, null, 2))}</pre>

                      <h3 style="margin:16px 0 8px 0;">Body</h3>
                      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:8px;border:1px solid #eee;">${escapeHtml(safeStringify(req.body))}</pre>

                      <h3 style="margin:16px 0 8px 0;">Stack</h3>
                      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:8px;border:1px solid #eee;">${escapeHtml(err.stack || '')}</pre>
                    </div>`;

                await sendMail({
                    to: (process.env.SUPPORT_EMAIL ? process.env.SUPPORT_EMAIL.split(',').map(email => email.trim()) : ['deep.nb2025@gmail.com']),
                    subject: `[${environment}] ${serviceName} CRITICAL ERROR`,
                    html,
                });
            } catch (mailErr) {
                logger.error('Failed to send exception email', { error: mailErr.message });
            }
        })();
    }

    res.status(statusCode).json({
        error: {
            logId: logId,  // Return the same id in the error response
            message,
            status: statusCode,
            type: errorType,
            code: errorCode,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
            ...({
                stack: err.stack,
                details
            })
        }
    });
};

function escapeHtml(value) {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function safeStringify(body) {
    try {
        return JSON.stringify(body, null, 2);
    } catch (e) {
        return '[Unstringifiable body]';
    }
}

export { AppError, ValidationError, DataTypeError, errorHandler };
