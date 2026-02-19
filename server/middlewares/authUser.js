import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        console.log('Auth Failure: No token found in cookies');
        return res.json({ success: false, message: 'Not Authorized' });
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET)
        if (tokenDecode.id) {
            req.userId = tokenDecode.id;
        } else {
            console.log('Auth Failure: Invalid token payload');
            return res.json({ success: false, message: 'Not Authorized' });
        }
        next();

    } catch (error) {
        console.log('Auth Error:', error.message);
        res.json({ success: false, message: error.message });
    }

}

export default authUser;