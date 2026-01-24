//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H
#define WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H

#include <memory>

#include "musicTagHandler.h"

class musicTagHandlerFactory {
public:
    static std::unique_ptr<musicTagHandler> createHandler(const std::string &extension);
};

#endif //WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H