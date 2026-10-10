<?php
declare(strict_types=1);

namespace Transenigma\Core;

/**
 * Allow-list input validation. Every API input passes through here (PRD §5.1).
 *
 *   $data = Validator::validate($request->json(), [
 *       'email' => 'required|email',
 *       'name'  => 'required|string|max:100',
 *       'age'   => 'required|int|min:18|max:100',
 *       'track' => 'required|in:STI,TTI',
 *       'tags'  => 'array|max:10',
 *       'note'  => 'nullable|string|max:1000',
 *   ]);
 *
 * Only keys listed in $rules are returned. Strings are trimmed and stripped of
 * control characters; emails are lower-cased. Absent optional keys are omitted.
 */
final class Validator
{
    /**
     * @param array<string,mixed>  $input
     * @param array<string,string> $rules
     * @return array<string,mixed>
     * @throws HttpException 422 with per-field messages
     */
    public static function validate(array $input, array $rules): array
    {
        $clean = [];
        $errors = [];

        foreach ($rules as $field => $ruleString) {
            $rules_ = self::parse($ruleString);
            $present = array_key_exists($field, $input) && $input[$field] !== null && $input[$field] !== '';

            if (!$present) {
                if (array_key_exists('required', $rules_)) {
                    $errors[$field] = 'This field is required.';
                } elseif (array_key_exists('nullable', $rules_) && array_key_exists($field, $input)) {
                    $clean[$field] = null;
                }
                continue;
            }

            $error = self::check($input[$field], $rules_, $value);
            if ($error !== null) {
                $errors[$field] = $error;
            } else {
                $clean[$field] = $value;
            }
        }

        if ($errors !== []) {
            throw HttpException::validation($errors);
        }
        return $clean;
    }

    /** @return array<string,?string> */
    private static function parse(string $rules): array
    {
        $parsed = [];
        foreach (explode('|', $rules) as $rule) {
            [$name, $arg] = array_pad(explode(':', $rule, 2), 2, null);
            $parsed[$name] = $arg;
        }
        return $parsed;
    }

    private static function check(mixed $raw, array $rules, mixed &$value): ?string
    {
        $value = $raw;
        $min = isset($rules['min']) ? (float) $rules['min'] : null;
        $max = isset($rules['max']) ? (float) $rules['max'] : null;

        if (array_key_exists('int', $rules)) {
            if (is_int($raw)) {
                $value = $raw;
            } elseif (is_string($raw) && preg_match('/^-?\d{1,10}$/', trim($raw))) {
                $value = (int) trim($raw);
            } else {
                return 'Must be a whole number.';
            }
            if ($min !== null && $value < $min) {
                return "Must be at least {$rules['min']}.";
            }
            if ($max !== null && $value > $max) {
                return "Must be at most {$rules['max']}.";
            }
        } elseif (array_key_exists('bool', $rules)) {
            if (is_bool($raw)) {
                $value = $raw;
            } elseif (in_array($raw, [0, 1, '0', '1', 'true', 'false'], true)) {
                $value = in_array($raw, [1, '1', 'true'], true);
            } else {
                return 'Must be true or false.';
            }
        } elseif (array_key_exists('array', $rules)) {
            if (!is_array($raw) || !array_is_list($raw)) {
                return 'Must be a list.';
            }
            if ($max !== null && count($raw) > $max) {
                return "Choose at most {$rules['max']}.";
            }
            if ($min !== null && count($raw) < $min) {
                return "Choose at least {$rules['min']}.";
            }
            $value = $raw;
        } else {
            // string-like (string, email, in)
            if (!is_string($raw) && !is_int($raw) && !is_float($raw)) {
                return 'Invalid value.';
            }
            $value = self::cleanString((string) $raw);
            if (array_key_exists('email', $rules)) {
                $value = mb_strtolower($value);
                if (mb_strlen($value) > 254 || !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    return 'Please enter a valid email address.';
                }
            }
            $length = mb_strlen($value);
            if ($min !== null && $length < $min) {
                return "Must be at least {$rules['min']} characters.";
            }
            if ($max !== null && $length > $max) {
                return "Must be at most {$rules['max']} characters.";
            }
        }

        if (isset($rules['in']) && !in_array((string) $value, explode(',', $rules['in']), true)) {
            return 'Invalid choice.';
        }
        if (isset($rules['regex']) && !preg_match($rules['regex'], (string) $value)) {
            return 'Invalid format.';
        }
        return null;
    }

    /** Trim and remove control characters (keeps newlines and tabs). */
    public static function cleanString(string $value): string
    {
        $value = preg_replace('/[^\P{C}\n\t]/u', '', $value) ?? '';
        return trim($value);
    }
}
