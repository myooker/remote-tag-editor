//
// Created by myooker on 1/27/26.
//

#ifndef WEB_TAG_EDITOR_SCOPETIMER_H
#define WEB_TAG_EDITOR_SCOPETIMER_H
#include <chrono>

struct scopeTimer {
    std::string name{};
    std::chrono::steady_clock::time_point start{ std::chrono::steady_clock::now() };
    ~scopeTimer() {
        const auto end = std::chrono::steady_clock::now();
        const auto us = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();
        CROW_LOG_DEBUG << "(Chrono) " << name << ": " << us << " us";
    }
};

#endif //WEB_TAG_EDITOR_SCOPETIMER_H