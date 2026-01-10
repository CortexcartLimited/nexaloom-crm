const assert = require('assert');
const { v4: uuidv4 } = require('uuid');

// Mock Dependencies
global.fetch = async (url, options) => {
    console.log(`[MockFetch] Request to ${url}`);
    if (url.includes('/deploy')) {
        return {
            ok: true,
            body: {
                getReader: () => ({
                    read: async () => ({ done: true, value: null }) // Immediate finish for test
                })
            }
        };
    }
    return { ok: false, text: async () => "Not Found" };
};

const mockPool = {
    query: async (sql, params) => {
        console.log(`[MockDB] ${sql} [${params}]`);
        // Simulate mysql2 promise return: [rows, fields]
        return [[], []];
    }
};

// Mock Helper because the route file requires it
const mockDemoManager = {
    getNextAvailablePort: async () => 8085
};
// We need to proxy the require call or mock the file it imports.
// Since we can't easily mock `require` in this context without a tool like proxyquire,
// and the file `server/routes/demos.js` does `require('../../lib/demoManager')`,
// we will assume that file exists and works, OR we might fail if it doesn't.
// Let's check if `lib/demoManager.js` exists.
// Logic: If it exists, great. If not, we might need to create a temporary dummy.

const runTest = async () => {
    console.log("--- Starting Backend Async Provisioning Verification ---");

    try {
        // Load the module
        // We expect `../../lib/demoManager` to be acquirable.
        // If this fails, we'll need to write a dummy file first.
        const demoRoutesFactory = require('../server/routes/demos.js');
        const { provision } = demoRoutesFactory(mockPool);

        // Mock Request and Response
        const req = { body: { leadId: 'test-lead-123' } };
        let responseData = null;
        let statusCode = 200;
        const res = {
            status: (code) => { statusCode = code; return res; },
            json: (data) => { responseData = data; }
        };

        // Execute Provision
        const startTime = Date.now();
        await provision(req, res);
        const duration = Date.now() - startTime;

        // Assertions
        console.log("Response Data:", responseData);
        assert.equal(statusCode, 200, "Status code should be 200");
        assert.equal(responseData.success, true, "Success should be true");
        assert.equal(responseData.status, 'PROVISIONING', "Status should be PROVISIONING");
        assert(duration < 1000, "Provisioning function should return immediately (async)");

        console.log("--- TEST PASSED: Provisioning endpoint is Async ---");

    } catch (error) {
        console.error("--- TEST FAILED ---");
        console.error(error);
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log("NOTE: Required dependencies might be missing in this environment.");
        }
    }
};

runTest();
