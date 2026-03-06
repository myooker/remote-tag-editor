//
// Created by myooker on 3/6/26.
//

#include "tests.h"
#include "../../include/scopeTimer.h"
#include "../../include/musicTagHandlerFactory.h"

namespace program::tests {
#define TEST_OK(msg) std::cout << __PRETTY_FUNCTION__ << " [" << testFilePath << "]: " << msg << '\n'
#define TEST_ERR(msg) std::cout << __PRETTY_FUNCTION__ << " [" << testFilePath << "]: " << msg << '\n'

    bool listMusicTags(const std::string &testDirectory) {
        for (const auto &f: audioFormats) {
            std::string testFilePath = testDirectory + std::string(fileName) + f;
            auto handler = musicTagHandlerFactory::createHandler(f);
            auto test = handler->listMusicTags(testFilePath);
            std::cout << testFilePath << ":\n";
            if (test) {
                std::cout << test.value().dump(4) << '\n';
                continue;
            }
            TEST_ERR(test.error());
            return false;
        }
        return true;
    }

    /**
     * @brief Adds debug tag fields to files
     * This function adds testField with value `test!!!` to test files.
     *
     * @param testDirectory a directory where testing files are located
     */
    bool addTestFieldTag(const std::string &testDirectory) {
        for (const auto &f: audioFormats) {
            std::string testFilePath = testDirectory + std::string(fileName) + f;
            tagMod.filePath = testFilePath;
            scopeTimer t{};
            auto handler = musicTagHandlerFactory::createHandler(f);
            std::cout << __PRETTY_FUNCTION__ << ": Adding test fields to " << fileName << f << '\n';
            auto addMusicTagHandler = handler->addMusicTag(tagMod);

            if (addMusicTagHandler.code != HTTP_OK) {
                TEST_ERR(addMusicTagHandler.body);
                return false;
            }
        }
        return true;
    }

    /**
     * @brief Adds debug unicode tag fields to files
     * This function adds n
     *
     * @param testDirectory
     */
    bool addTestFieldTagUnicode(const std::string &testDirectory) {
        for (const auto &f: audioFormats) {
            std::string testFilePath = testDirectory + std::string(fileName) + f;
            tagModUnicode.filePath = testFilePath;
            scopeTimer t{};
            auto handler = musicTagHandlerFactory::createHandler(f);
            std::cout << __PRETTY_FUNCTION__ << ": Adding test fields to " << fileName << f << '\n';
            auto respone = handler->addMusicTag(tagModUnicode);

            if (respone.code != HTTP_OK) {
                TEST_ERR(respone.body);
                return false;
            }
        }
        return true;
    }

    bool findTestField(const std::string &testDirectory) {
        for (const auto &f: audioFormats) {
            std::string testFilePath = testDirectory + std::string(fileName) + f;
            tagMod.filePath = testFilePath;
            auto handler = musicTagHandlerFactory::createHandler(f);
            auto listMusicTagsHandler = handler->listMusicTags(tagMod.filePath);

            if (listMusicTagsHandler) {
                auto findit = listMusicTagsHandler.value().find(userFieldType);
                auto capfindit = listMusicTagsHandler.value().find(USERFIELDTYPE);

                if (findit != listMusicTagsHandler.value().end() || capfindit != listMusicTagsHandler.value().end()) {
                    TEST_OK("testFieldType was found!");
                } else {
                    TEST_ERR("testFieldType was not found");
                    return false;
                }
            } else {
                TEST_ERR(listMusicTagsHandler.error());
                return false;
            }
        }
        return true;
    }

    bool removeTestField(const std::string &testDirectory) {
        for (const auto &f: audioFormats) {
            std::string testFilePath = testDirectory + std::string(fileName) + f;
            tagMod.filePath = testFilePath;
            auto handler = musicTagHandlerFactory::createHandler(f);
            auto response = handler->removeMusicTag(tagMod);

            if (response.code != HTTP_OK) {
                TEST_ERR(response.body);
                return false;
            }
        }
        return true;
    }

    void runTests(std::string &testDirectory) {
        if (!testDirectory.ends_with("/"))
            testDirectory.push_back('/');

        int passed = 0, failed = 0;

        listMusicTags(testDirectory) ? ++passed : ++failed;
        addTestFieldTag(testDirectory) ? ++passed : ++failed;
        findTestField(testDirectory) ? ++passed : ++failed;
        removeTestField(testDirectory) ? ++passed : ++failed;

        std::cout << "\n\nTest results\n"
            << "\tPASSED: " << passed << '\n'
            << "\tFAILED: " << failed << '\n';
    }
}
