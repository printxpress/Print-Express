import app from '../server/server.js';

export default (req, res) => {
    console.log(`Vercel Function triggered: ${req.method} ${req.url}`);
    return app(req, res);
};

