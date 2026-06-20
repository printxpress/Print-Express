import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
    // Try to get token from cookie or Authorization header
    let token = req.cookies.token;

    if (!token && req.headers.authorization) {
        if (req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
    }

    if (!token) {
        return res.json({ success: false, message: 'Not Authorized' });
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET)
        if (tokenDecode.id) {
            req.userId = tokenDecode.id;
        } else {
            return res.json({ success: false, message: 'Not Authorized' });
        }
        next();

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export default authUser;