/// 패키지 공용 유틸리티.
module dibang_wedding::utils;

use std::string::String;

/// UTF8 문자열의 글자(코드포인트) 수를 센다.
///
/// UTF8에서 continuation byte(상위 2비트가 `10`)가 아닌 바이트의 개수가 곧 글자 수다.
/// `String::length()`는 바이트 수를 돌려주므로 한글처럼 멀티바이트 문자가 섞이면
/// 글자 수와 어긋난다. 이 함수는 글자 단위로 정확히 세어 길이 제한을 검증한다.
public fun utf8_char_count(s: &String): u64 {
    let bytes = s.as_bytes();
    let len = bytes.length();
    let mut count = 0;
    let mut i = 0;
    while (i < len) {
        // continuation byte(0b10xxxxxx)가 아니면 새 글자의 시작 바이트다.
        if (bytes[i] & 0xC0 != 0x80) {
            count = count + 1;
        };
        i = i + 1;
    };
    count
}

// === Tests ===

#[test_only]
use std::unit_test::assert_eq;

#[test]
fun counts_ascii() {
    assert_eq!(utf8_char_count(&b"hello".to_string()), 5);
}

#[test]
fun counts_empty() {
    assert_eq!(utf8_char_count(&b"".to_string()), 0);
}

#[test]
fun counts_multibyte_chars_not_bytes() {
    // "é" = 0xC3 0xA9 — 2바이트지만 1글자.
    let s = std::string::utf8(vector[0xC3, 0xA9]);
    assert_eq!(s.as_bytes().length(), 2);
    assert_eq!(utf8_char_count(&s), 1);
}
