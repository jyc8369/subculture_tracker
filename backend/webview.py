import logging

import webview

logger = logging.getLogger(__name__)


def create_and_start_window(url: str, title: str = 'Subculture Tracker', width: int = 1200, height: int = 800, resizable: bool = False) -> None:
    logger.info('[webview] creating GUI window for %s', url)
    webview.create_window(
        title,
        url,
        width=width,
        height=height,
        resizable=resizable,
    )
    logger.info('[webview] starting GUI event loop')
    webview.start()
