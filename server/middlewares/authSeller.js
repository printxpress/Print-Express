import jwt from 'jsonwebtoken';

const authSeller = async (req, res, next) => {
    const { sellerToken } = req.cookies;

    if (!sellerToken) {
        console.log('Seller Auth Failure: No sellerToken found in cookies');
        return res.json({ success: false, message: 'Not Authorized' });
    }

    try {
        const tokenDecode = jwt.verify(sellerToken, process.env.JWT_SECRET)

        // Check role FIRST, then fallback to email (legacy/direct env match)
        const role = tokenDecode.role;
        const isAdmin = role === 'admin' || tokenDecode.email === process.env.SELLER_EMAIL;
        const isBillingManager = role === 'billing_manager' || tokenDecode.email === process.env.BILLING_EMAIL;

        if (isAdmin || isBillingManager) {
            req.sellerEmail = tokenDecode.email;
            req.sellerId = tokenDecode.id;
            req.sellerRole = role || (isAdmin ? 'admin' : 'billing_manager');
            next();
        } else {
            console.log('Seller Auth Failure: Invalid role or email mismatch');
            return res.json({ success: false, message: 'Not Authorized' });
        }

    } catch (error) {
        console.log('Seller Auth Error:', error.message);
        res.json({ success: false, message: error.message });
    }

}

export const authAdmin = async (req, res, next) => {
    if (req.sellerRole !== 'admin') {
        return res.json({ success: false, message: 'Admin Access Required' });
    }
    next();
}

export default authSeller;