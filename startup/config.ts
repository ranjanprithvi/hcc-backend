import config from "config";

export default function checkConfigVariables() {
    if (!config.get("JWTPrivateKey")) {
        throw new Error("FATAL ERROR.. Private Key is not set");
    }
    // if (!config.get("MongoPassword")) {
    //     throw new Error("FATAL ERROR.. MongoDB password is not set");
    // }
}

// console.log(`NODE_ENV: ${process.env.NODE_ENV}`); //--> returns undef if NODE_ENV not set
// console.log(`App: ${app.get("env")}`); //--> returns 'development' by default
