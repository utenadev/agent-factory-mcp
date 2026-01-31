import { describe, expect, it } from "vitest";
import { ArgumentValidator } from "../../src/utils/argumentValidator.js";
import { SecurityError } from "../../src/utils/errors.js";

describe("ArgumentValidator - Extended Edge Cases", () => {
  const validator = new ArgumentValidator();

  describe("Length Boundary Tests", () => {
    it("should accept arguments at exact max length boundary", () => {
      const exactLengthArg = "a".repeat(10000);
      expect(() => {
        validator.validate([exactLengthArg], { argumentType: "generic" });
      }).not.toThrow();
    });

    it("should block arguments exceeding max length", () => {
      const tooLongArg = "a".repeat(10001);
      expect(() => {
        validator.validate([tooLongArg], { argumentType: "generic" });
      }).toThrow(SecurityError);
    });

    it("should accept session IDs at exact boundary", () => {
      const exactLengthId = "a".repeat(256);
      expect(() => {
        validator.validateSessionId(exactLengthId);
      }).not.toThrow();
    });

    it("should block session IDs exceeding boundary", () => {
      const tooLongId = "a".repeat(257);
      expect(() => {
        validator.validateSessionId(tooLongId);
      }).toThrow(SecurityError);
    });
  });

  describe("Combined Attack Patterns", () => {
    it("should block shell injection with path traversal", () => {
      const combined = "; cat ../../etc/passwd";
      expect(() => {
        validator.validate([combined], { argumentType: "command" });
      }).toThrow(SecurityError);
    });
  });

  describe("Whitespace Edge Cases", () => {
    it("should handle leading/trailing whitespace", () => {
      const spacedArg = "  ../etc/passwd  ";
      expect(() => {
        validator.validate([spacedArg], { argumentType: "filePath" });
      }).toThrow(SecurityError);
    });
  });

  describe("Special Characters in Context", () => {
    it("should block shell chars in command context", () => {
      expect(() => {
        validator.validate([";"], { argumentType: "command" });
      }).toThrow(SecurityError);

      expect(() => {
        validator.validate(["|"], { argumentType: "command" });
      }).toThrow(SecurityError);

      expect(() => {
        validator.validate(["&"], { argumentType: "command" });
      }).toThrow(SecurityError);
    });

    it("should allow same chars in prompt context", () => {
      expect(() => {
        validator.validate(["A | B & C; D"], { argumentType: "prompt" });
      }).not.toThrow();
    });

    it("should handle backticks correctly", () => {
      expect(() => {
        validator.validate(["`whoami`"], { argumentType: "command" });
      }).toThrow(SecurityError);
    });
  });

  describe("Nested Path Patterns", () => {
    it("should block deeply nested traversal", () => {
      const deepTraversal = "../../../../../../../../../etc/passwd";
      expect(() => {
        validator.validate([deepTraversal], { argumentType: "filePath" });
      }).toThrow(SecurityError);
    });

    it("should handle mixed path separators", () => {
      const mixedSep = "../..\\../../secret";
      expect(() => {
        validator.validate([mixedSep], { argumentType: "filePath" });
      }).toThrow(SecurityError);
    });
  });

  describe("Case Sensitivity", () => {
    it("should handle uppercase shell special chars", () => {
      expect(() => {
        validator.validate(["CMD | OTHER"], { argumentType: "command" });
      }).toThrow(SecurityError);
    });
  });

  describe("Configuration Override", () => {
    it("should use custom max length from config", () => {
      const customValidator = new ArgumentValidator({
        maxArgumentLength: 100,
      });

      expect(() => {
        customValidator.validate(["a".repeat(101)], { argumentType: "generic" });
      }).toThrow(SecurityError);

      expect(() => {
        customValidator.validate(["a".repeat(100)], { argumentType: "generic" });
      }).not.toThrow();
    });

    it("should use custom shell chars from config", () => {
      const customValidator = new ArgumentValidator({
        shellSpecialChars: ["!"],
      });

      expect(() => {
        customValidator.validate(["!danger"], { argumentType: "command" });
      }).toThrow(SecurityError);
    });
  });

  describe("Empty and Null Cases", () => {
    it("should handle empty array", () => {
      expect(() => {
        validator.validate([], { argumentType: "generic" });
      }).not.toThrow();
    });

    it("should handle array with empty strings", () => {
      expect(() => {
        validator.validate(["", ""], { argumentType: "generic" });
      }).not.toThrow();
    });

    it("should handle single character", () => {
      expect(() => {
        validator.validate(["a"], { argumentType: "generic" });
      }).not.toThrow();
    });
  });

  describe("Future Enhancement Tests", () => {
    it.skip("should block URL encoded traversal (future enhancement)", () => {
      const maliciousArgs = ["%2e%2e%2fetc%2fpasswd", "%2e%2e%5cwindows%5csystem32"];
      for (const arg of maliciousArgs) {
        expect(() => {
          validator.validate([arg], { argumentType: "filePath" });
        }).toThrow(SecurityError);
      }
    });

    it.skip("should block double encoded traversal (future enhancement)", () => {
      const doubleEncoded = "%252e%252e%252f";
      expect(() => {
        validator.validate([doubleEncoded], { argumentType: "filePath" });
      }).toThrow(SecurityError);
    });

    it.skip("should block Unicode homograph attacks (future enhancement)", () => {
      const unicodeTraversal = "..／etc／passwd";
      expect(() => {
        validator.validate([unicodeTraversal], { argumentType: "filePath" });
      }).toThrow(SecurityError);
    });

    it.skip("should block null byte injection (future enhancement)", () => {
      const nullByteArg = "safe.txt\x00.php";
      expect(() => {
        validator.validate([nullByteArg], { argumentType: "filePath" });
      }).toThrow(SecurityError);
    });

    it.skip("should handle tab characters (future enhancement)", () => {
      const tabbedArg = "..\t/etc/passwd";
      expect(() => {
        validator.validate([tabbedArg], { argumentType: "filePath" });
      }).toThrow(SecurityError);
    });

    it.skip("should handle newline injection attempts (future enhancement)", () => {
      const newlineArg = "..\n/etc/passwd";
      expect(() => {
        validator.validate([newlineArg], { argumentType: "filePath" });
      }).toThrow(SecurityError);
    });
  });
});
