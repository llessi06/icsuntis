export function requestLogger(req, res, next) {
    const start = Date.now();
    const method = req.method;
    const url = req.url;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const timestamp = new Date().toISOString();

        console.log(`[${timestamp}] ${method} ${url} ${status} - ${duration}ms`);
    });

    next();
}
