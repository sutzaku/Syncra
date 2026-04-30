const { badRequest } = require('../utils/response');

/**
 * Simple request body validator middleware factory.
 * 
 * @param {string[]} requiredFields - Array of required field names
 * @returns Express middleware
 * 
 * Usage: validate(['email', 'password'])
 */
const validate = (requiredFields) => {
    return (req, res, next) => {
        const missing = [];

        for (const field of requiredFields) {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                missing.push(field);
            }
        }

        if (missing.length > 0) {
            return badRequest(res, 'Missing required fields', {
                missing_fields: missing
            });
        }

        next();
    };
};

module.exports = validate;
