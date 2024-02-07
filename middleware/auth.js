import jwt from "jsonwebtoken";
import config from "config";

export function auth(req, res, next) {
    const token = req.header("x-auth-token");
    if (!token)
        return res.status(401).send("Access Denied. No token provided.");

    try {
        const decoded = jwt.verify(token, config.get("JWTPrivateKey"));
        req.account = decoded;
        next();
    } catch (ex) {
        res.status(400).send("Invalid Token.");
    }
}
