//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H
#define WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H

#include <memory>

#include "ImusicTagHandler.h"

class musicTagHandlerFactory {
public:
    static std::unique_ptr<ImusicTagHandler> createHandler(const std::string &extension);
};

#endif //WEB_TAG_EDITOR_MUSICTAGHANDLERFACTORY_H