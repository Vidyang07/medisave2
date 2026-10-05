/**
 * MEDISAVE - Jasmine BDD Testing Framework
 * 
 * Provides a pure Jasmine/BDD-compatible testing interface:
 * - describe(description, specDefinitions)
 * - it(description, testFn)
 * - beforeAll(fn)
 * - afterAll(fn)
 * - beforeEach(fn)
 * - afterEach(fn)
 * - expect(actual) with full matcher chain (.not, .toBe, .toEqual, .toContain, .toBeNull, .toBeDefined, .toBeTruthy, etc.)
 */

export class JasmineRunner {
  constructor(suiteName = "Jasmine Test Suite") {
    this.suiteName = suiteName;
    this.suites = [];
    this.currentSuite = null;
    this.totalSpecs = 0;
    this.passedSpecs = 0;
    this.failedSpecs = 0;
    this.totalExpectations = 0;
    this.passedExpectations = 0;
    this.failedExpectations = 0;
    this.failures = [];
    this.startTime = 0;

    // Bind all runner methods so destructuring works cleanly
    this.describe = this.describe.bind(this);
    this.it = this.it.bind(this);
    this.beforeAll = this.beforeAll.bind(this);
    this.afterAll = this.afterAll.bind(this);
    this.beforeEach = this.beforeEach.bind(this);
    this.afterEach = this.afterEach.bind(this);
    this.expect = this.expect.bind(this);
  }

  describe(title, fn) {
    const parentSuite = this.currentSuite;
    const suite = {
      title,
      parent: parentSuite,
      specs: [],
      beforeAllHooks: [],
      afterAllHooks: [],
      beforeEachHooks: [],
      afterEachHooks: [],
      children: [],
    };

    if (parentSuite) {
      parentSuite.children.push(suite);
    } else {
      this.suites.push(suite);
    }

    this.currentSuite = suite;
    fn();
    this.currentSuite = parentSuite;
  }

  it(title, fn) {
    if (!this.currentSuite) {
      throw new Error("Cannot define an 'it' block outside a 'describe' block");
    }
    this.currentSuite.specs.push({
      title,
      fn,
      suite: this.currentSuite,
    });
    this.totalSpecs++;
  }

  beforeAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeAllHooks.push(fn);
    }
  }

  afterAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterAllHooks.push(fn);
    }
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEachHooks.push(fn);
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEachHooks.push(fn);
    }
  }

  expect(actual) {
    const runner = this;
    const isNot = false;

    const createMatcher = (negated) => {
      const record = (passed, message) => {
        runner.totalExpectations++;
        if (passed) {
          runner.passedExpectations++;
        } else {
          runner.failedExpectations++;
          const err = new Error(message);
          throw err;
        }
      };

      const matchers = {
        toBe(expected) {
          const pass = Object.is(actual, expected);
          const msg = negated
            ? `Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`
            : `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`;
          record(negated ? !pass : pass, msg);
        },

        toEqual(expected) {
          const pass = JSON.stringify(actual) === JSON.stringify(expected);
          const msg = negated
            ? `Expected ${JSON.stringify(actual)} NOT to deeply equal ${JSON.stringify(expected)}`
            : `Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`;
          record(negated ? !pass : pass, msg);
        },

        toBeDefined() {
          const pass = actual !== undefined;
          const msg = negated
            ? `Expected value to be undefined, but got ${JSON.stringify(actual)}`
            : `Expected value to be defined, but got undefined`;
          record(negated ? !pass : pass, msg);
        },

        toBeUndefined() {
          const pass = actual === undefined;
          const msg = negated
            ? `Expected value to be defined, but got undefined`
            : `Expected value to be undefined, but got ${JSON.stringify(actual)}`;
          record(negated ? !pass : pass, msg);
        },

        toBeNull() {
          const pass = actual === null;
          const msg = negated
            ? `Expected value NOT to be null`
            : `Expected value to be null, but got ${JSON.stringify(actual)}`;
          record(negated ? !pass : pass, msg);
        },

        toBeTruthy() {
          const pass = Boolean(actual);
          const msg = negated
            ? `Expected value to be falsy, but got ${JSON.stringify(actual)}`
            : `Expected value to be truthy, but got ${JSON.stringify(actual)}`;
          record(negated ? !pass : pass, msg);
        },

        toBeFalsy() {
          const pass = !Boolean(actual);
          const msg = negated
            ? `Expected value to be truthy, but got ${JSON.stringify(actual)}`
            : `Expected value to be falsy, but got ${JSON.stringify(actual)}`;
          record(negated ? !pass : pass, msg);
        },

        toContain(expected) {
          let pass = false;
          if (typeof actual === "string") {
            pass = actual.includes(expected);
          } else if (Array.isArray(actual)) {
            pass = actual.includes(expected) || actual.some((item) => JSON.stringify(item) === JSON.stringify(expected));
          } else if (actual && typeof actual === "object") {
            pass = expected in actual;
          }
          const msg = negated
            ? `Expected ${JSON.stringify(actual)} NOT to contain ${JSON.stringify(expected)}`
            : `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`;
          record(negated ? !pass : pass, msg);
        },

        toBeGreaterThan(expected) {
          const pass = actual > expected;
          const msg = negated
            ? `Expected ${actual} NOT to be greater than ${expected}`
            : `Expected ${actual} to be greater than ${expected}`;
          record(negated ? !pass : pass, msg);
        },

        toBeGreaterThanOrEqual(expected) {
          const pass = actual >= expected;
          const msg = negated
            ? `Expected ${actual} NOT to be greater than or equal to ${expected}`
            : `Expected ${actual} to be greater than or equal to ${expected}`;
          record(negated ? !pass : pass, msg);
        },

        toBeLessThan(expected) {
          const pass = actual < expected;
          const msg = negated
            ? `Expected ${actual} NOT to be less than ${expected}`
            : `Expected ${actual} to be less than ${expected}`;
          record(negated ? !pass : pass, msg);
        },

        toBeLessThanOrEqual(expected) {
          const pass = actual <= expected;
          const msg = negated
            ? `Expected ${actual} NOT to be less than or equal to ${expected}`
            : `Expected ${actual} to be less than or equal to ${expected}`;
          record(negated ? !pass : pass, msg);
        },

        toMatch(regex) {
          const re = typeof regex === "string" ? new RegExp(regex) : regex;
          const pass = re.test(String(actual));
          const msg = negated
            ? `Expected "${actual}" NOT to match pattern ${re}`
            : `Expected "${actual}" to match pattern ${re}`;
          record(negated ? !pass : pass, msg);
        },

        toBeCloseTo(expected, precision = 2) {
          const pass = Math.abs(actual - expected) < Math.pow(10, -precision) / 2;
          const msg = negated
            ? `Expected ${actual} NOT to be close to ${expected}`
            : `Expected ${actual} to be close to ${expected} with precision ${precision}`;
          record(negated ? !pass : pass, msg);
        },
      };

      if (!negated) {
        matchers.not = createMatcher(true);
      }

      return matchers;
    };

    return createMatcher(isNot);
  }

  async runSuite(suite, indent = 0) {
    const pad = "  ".repeat(indent);
    console.log(`${pad}Suite: \x1b[1m${suite.title}\x1b[0m`);

    // Run beforeAll hooks for this suite
    for (const hook of suite.beforeAllHooks) {
      await hook();
    }

    // Collect all beforeEach hooks from root down to this suite
    const getBeforeEachHooks = (s) => {
      const hooks = s.parent ? getBeforeEachHooks(s.parent) : [];
      return hooks.concat(s.beforeEachHooks);
    };

    // Collect all afterEach hooks
    const getAfterEachHooks = (s) => {
      const hooks = s.afterEachHooks.slice();
      if (s.parent) {
        return hooks.concat(getAfterEachHooks(s.parent));
      }
      return hooks;
    };

    const beforeEachList = getBeforeEachHooks(suite);
    const afterEachList = getAfterEachHooks(suite);

    // Execute specs in this suite
    for (const spec of suite.specs) {
      const specPad = "  ".repeat(indent + 1);
      try {
        for (const hook of beforeEachList) {
          await hook();
        }

        const specStart = Date.now();
        await spec.fn();
        const duration = Date.now() - specStart;

        console.log(`${specPad}\x1b[32m✔\x1b[0m ${spec.title} \x1b[90m(${duration}ms)\x1b[0m`);
        this.passedSpecs++;
      } catch (err) {
        console.log(`${specPad}\x1b[31m✖\x1b[0m ${spec.title}`);
        console.log(`${specPad}  \x1b[31mError: ${err.message}\x1b[0m`);
        this.failedSpecs++;
        this.failures.push({
          suiteTitle: suite.title,
          specTitle: spec.title,
          error: err,
        });
      } finally {
        for (const hook of afterEachList) {
          try {
            await hook();
          } catch (e) {
            console.error(`${specPad}  \x1b[31mError in afterEach: ${e.message}\x1b[0m`);
          }
        }
      }
    }

    // Execute child suites
    for (const child of suite.children) {
      await this.runSuite(child, indent + 1);
    }

    // Run afterAll hooks
    for (const hook of suite.afterAllHooks) {
      await hook();
    }
  }

  async execute() {
    this.startTime = Date.now();
    console.log("\n" + "=".repeat(75));
    console.log(`  JASMINE BDD TEST RUNNER — ${this.suiteName.toUpperCase()}`);
    console.log("=".repeat(75) + "\n");

    for (const suite of this.suites) {
      await this.runSuite(suite, 0);
      console.log("");
    }

    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log("-".repeat(75));
    console.log(`  JASMINE EXECUTION SUMMARY:`);
    console.log(`  • Suites Executed    : ${this.suites.length}`);
    console.log(`  • Total Specs        : ${this.totalSpecs}`);
    console.log(`  • Passed Specs       : \x1b[32m${this.passedSpecs}\x1b[0m`);
    console.log(`  • Failed Specs       : ${this.failedSpecs > 0 ? `\x1b[31m${this.failedSpecs}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
    console.log(`  • Total Expectations : ${this.totalExpectations} (${this.passedExpectations} passed, ${this.failedExpectations} failed)`);
    console.log(`  • Total Execution    : ${totalTime}s`);
    console.log("=".repeat(75) + "\n");

    if (this.failures.length > 0) {
      console.log("\x1b[31mFAILURES BREAKDOWN:\x1b[0m");
      this.failures.forEach((f, idx) => {
        console.log(`\n${idx + 1}) [${f.suiteTitle}] -> ${f.specTitle}`);
        console.log(`   ${f.error.stack || f.error.message}`);
      });
      console.log("");
    }

    return {
      totalSpecs: this.totalSpecs,
      passedSpecs: this.passedSpecs,
      failedSpecs: this.failedSpecs,
      totalExpectations: this.totalExpectations,
      passedExpectations: this.passedExpectations,
      failedExpectations: this.failedExpectations,
      success: this.failedSpecs === 0,
    };
  }
}

// HTTP helper for specs
export const API_BASE = "http://localhost:5000/api";

export async function http(method, path, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const opts = { method, headers };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data,
  };
}
