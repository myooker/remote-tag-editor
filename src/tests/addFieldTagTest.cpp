//
// Created by myooker on 3/2/26.
//

#include "addFieldTagTest.h"
#include "../../include/musicTagHandlerFactory.h"
#include "tests.h"

namespace program::tests {
    void addMusicTag(const std::string &debugDirectory) {
        int count { 1 };

        for (const auto &f : audioFormats) {
            std::string testFilePath = debugDirectory + std::string(fileName) + f;
            tagMod.filePath = testFilePath;
            scopeTimer t{};
            auto handler = musicTagHandlerFactory::createHandler(f);
            std::cout << __PRETTY_FUNCTION__ << ": Adding test fields to " << fileName << f << '\n';
            auto handlerTest = handler->addMusicTag(tagMod);
        }

    }
}
