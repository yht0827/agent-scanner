package com.agentscanner.engine.catalog;

import java.util.Arrays;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * List&lt;String&gt;을 DB의 JSON 문자열 컬럼으로 상호 변환하는 JPA AttributeConverter.
 *
 * <p>주요 특징:</p>
 * <ul>
 *   <li>표준 JSON 배열 형식([\"a\", \"b\"]) 지원</li>
 *   <li>레거시 또는 수동 DB 입력 형태의 쉼표 구분(CSV) 형식 자동 폴백 지원</li>
 *   <li>null 및 빈 원소 필터링을 통한 데이터 정제</li>
 *   <li>불변 리스트 반환을 통한 불필요한 메모리 할당 방지 및 엔티티 사이드 이펙트 방지</li>
 * </ul>
 */
@Slf4j
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

	private static final String EMPTY_JSON_ARRAY = "[]";
	private static final TypeReference<List<String>> TYPE_REF = new TypeReference<>() {};
	private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
			.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

	@Override
	public String convertToDatabaseColumn(List<String> attribute) {
		if (attribute == null || attribute.isEmpty()) {
			return EMPTY_JSON_ARRAY;
		}

		List<String> cleanList = attribute.stream()
				.filter(s -> s != null && !s.isBlank())
				.map(String::trim)
				.toList();

		if (cleanList.isEmpty()) {
			return EMPTY_JSON_ARRAY;
		}

		try {
			return OBJECT_MAPPER.writeValueAsString(cleanList);
		} catch (JsonProcessingException e) {
			log.error("Error serializing List<String> to JSON: {}", attribute, e);
			return EMPTY_JSON_ARRAY;
		}
	}

	@Override
	public List<String> convertToEntityAttribute(String dbData) {
		if (dbData == null || dbData.isBlank()) {
			return List.of();
		}

		String trimmed = dbData.trim();
		if (EMPTY_JSON_ARRAY.equals(trimmed)) {
			return List.of();
		}

		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			try {
				List<String> list = OBJECT_MAPPER.readValue(trimmed, TYPE_REF);
				if (list == null || list.isEmpty()) {
					return List.of();
				}
				return list.stream()
						.filter(s -> s != null && !s.isBlank())
						.map(String::trim)
						.toList();
			} catch (JsonProcessingException e) {
				log.warn("Failed to parse JSON array: '{}', falling back to comma-separated parsing", trimmed, e);
			}
		}

		return parseCommaSeparated(trimmed);
	}

	private List<String> parseCommaSeparated(String text) {
		String cleaned = text.replaceAll("^\\[|\\]$", "").trim();
		if (cleaned.isBlank()) {
			return List.of();
		}
		return Arrays.stream(cleaned.split(","))
				.map(String::trim)
				.map(s -> s.replaceAll("^\"|\"$", "").replaceAll("^'|'$", "").trim())
				.filter(s -> !s.isBlank())
				.toList();
	}
}
