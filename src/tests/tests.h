//
// Created by myooker on 3/2/26.
//

#ifndef WEB_TAG_EDITOR_TESTS_H
#define WEB_TAG_EDITOR_TESTS_H

#include <array>
#include <string_view>

#include "../../include/music.h"
#include "../../include/program.h"

namespace program::tests {
    constexpr std::array audioFormats { ".mp3", ".m4a", ".flac", ".ogg" };
    constexpr std::string_view fileName { "test" };
    constexpr std::string_view userFieldType { "testFieldType" };
    constexpr std::string_view USERFIELDTYPE { "TESTFIELDTYPE" };
    constexpr std::string_view userFieldTypeUnicode { "тестовое поле" };
    constexpr std::string_view normalizedFieldType { music::tag::album };
    constexpr std::string_view value { "test!!!" };
    constexpr std::string_view valueModified { "test!!!, but modified" };
    constexpr std::string_view valueUnicode { "тест!!!" };
    constexpr std::string_view valueUnicodeModified { "тест!!!, но отредактированный" };

    constexpr int HTTP_OK { 200 };

    inline TagModification tagMod {
        "",
        std::string(userFieldType),
        std::string(value),
        std::string(valueModified),
        std::string(value)
    };

    inline TagModification tagModUnicode {
        "",
        std::string(userFieldTypeUnicode),
        std::string(valueUnicode),
        std::string(valueUnicodeModified),
        std::string(valueUnicode)
    };

    bool listMusicTags(const std::string &testDirectory);
    bool addTestFieldTag(const std::string &testDirectory);
    bool addTestFieldTagUnicode(const std::string &testDirectory);
    bool findTestField(const std::string &testDirectory);
    bool removeTestField(const std::string &testDirectory);

    void runTests(std::string &testDirectory);
}

#endif //WEB_TAG_EDITOR_TESTS_H