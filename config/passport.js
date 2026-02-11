const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/user');
require('dotenv').config();
const generateReferralCode = (name) => {
  return (
    name.substring(0, 4).toUpperCase() +
    Math.floor(1000 + Math.random() * 9000)
  );
};

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "https://applestorehub.com/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    return done(null, user);
                }
             const newReferralCode = generateReferralCode(profile.displayName)
                
                user = new User({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    avatar: profile.photos?.[0]?.value,
                    googleId: profile.id,
                    isVerified: true, 
                    referralCode:newReferralCode
                });

                await user.save();
                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
