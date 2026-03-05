//
// Created by myooker on 3/2/26.
//

#include "tagJsonTest.h"
#include "tests.h"
#include <assert.h>
#include "../../include/musicTagHandlerFactory.h"
#include "../../include/scopeTimer.h"

namespace program::tests {
    void listMusicTags(const std::string &debugDirectory) {
        int count { 1 };

        for (const auto &f : audioFormats) {
            std::string testFilePath = debugDirectory + std::string(fileName) + f;
            scopeTimer t{};
            auto handler = musicTagHandlerFactory::createHandler(f);
            std::cout << "==== TEST: " << count << "; filename: " << testFilePath << " ====\n";
            auto test = handler->listMusicTags(testFilePath);
            if (test) {
                std::cout << test.value().dump(4) << '\n';
            } else {
                assert(false && test.error().c_str());
            }
            count++;
        }
    }
}
