package com.agentscanner.engine.catalog;

import static org.assertj.core.api.Assertions.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class StringListConverterTest {

	private final StringListConverter converter = new StringListConverter();

	@Nested
	@DisplayName("convertToDatabaseColumn 테스트")
	class ConvertToDatabaseColumnTest {

		@Test
		@DisplayName("null 입력 시 '[]' 반환")
		void nullInputReturnsEmptyArray() {
			String result = converter.convertToDatabaseColumn(null);
			assertThat(result).isEqualTo("[]");
		}

		@Test
		@DisplayName("빈 리스트 입력 시 '[]' 반환")
		void emptyListReturnsEmptyArray() {
			String result = converter.convertToDatabaseColumn(List.of());
			assertThat(result).isEqualTo("[]");
		}

		@Test
		@DisplayName("null 또는 공백만 포함된 리스트는 '[]' 반환")
		void blankOnlyElementsReturnEmptyArray() {
			List<String> input = new ArrayList<>();
			input.add(null);
			input.add("   ");
			input.add("");

			String result = converter.convertToDatabaseColumn(input);
			assertThat(result).isEqualTo("[]");
		}

		@Test
		@DisplayName("유효한 문자열 목록을 직렬화할 때 공백 제거 및 null 필터링 후 JSON 배열로 변환")
		void validListSerializesToJson() {
			List<String> input = Arrays.asList("toolA", "  toolB  ", null, "toolC");

			String result = converter.convertToDatabaseColumn(input);
			assertThat(result).isEqualTo("[\"toolA\",\"toolB\",\"toolC\"]");
		}
	}

	@Nested
	@DisplayName("convertToEntityAttribute 테스트")
	class ConvertToEntityAttributeTest {

		@Test
		@DisplayName("null 또는 공백 문자열 입력 시 빈 리스트 반환")
		void nullOrBlankReturnsEmptyList() {
			assertThat(converter.convertToEntityAttribute(null)).isEmpty();
			assertThat(converter.convertToEntityAttribute("")).isEmpty();
			assertThat(converter.convertToEntityAttribute("   ")).isEmpty();
		}

		@Test
		@DisplayName("'[]' 입력 시 빈 리스트 반환")
		void emptyJsonArrayReturnsEmptyList() {
			assertThat(converter.convertToEntityAttribute("[]")).isEmpty();
			assertThat(converter.convertToEntityAttribute(" [ ] ")).isEmpty();
		}

		@Test
		@DisplayName("표준 JSON 배열 파싱 성공")
		void parsesStandardJsonArray() {
			String json = "[\"queryDatabase\", \"executeSystemCommand\"]";

			List<String> result = converter.convertToEntityAttribute(json);

			assertThat(result).containsExactly("queryDatabase", "executeSystemCommand");
		}

		@Test
		@DisplayName("레거시 쉼표 구분(CSV) 문자열도 정상 파싱 (폴백 기능)")
		void parsesCommaSeparatedStringFallback() {
			String csv = "queryDatabase, executeSystemCommand, sendEmail";

			List<String> result = converter.convertToEntityAttribute(csv);

			assertThat(result).containsExactly("queryDatabase", "executeSystemCommand", "sendEmail");
		}

		@Test
		@DisplayName("따옴표가 포함된 CSV 문자열도 안전하게 정제 파싱")
		void parsesQuotedCsv() {
			String quotedCsv = "\"toolA\", 'toolB', \"toolC\"";

			List<String> result = converter.convertToEntityAttribute(quotedCsv);

			assertThat(result).containsExactly("toolA", "toolB", "toolC");
		}

		@Test
		@DisplayName("불완전한 JSON 배열 문자열도 폴백 메커니즘을 통해 복구 파싱")
		void recoversMalformedJson() {
			String malformed = "[\"toolA\", \"toolB\"";

			List<String> result = converter.convertToEntityAttribute(malformed);

			assertThat(result).containsExactly("toolA", "toolB");
		}

		@Test
		@DisplayName("반환된 리스트는 불변(Unmodifiable)으로 수정 시 예외 발생")
		void returnedListIsImmutable() {
			List<String> result = converter.convertToEntityAttribute("[\"toolA\"]");

			assertThatThrownBy(() -> result.add("newTool"))
					.isInstanceOf(UnsupportedOperationException.class);
		}
	}
}
