import logging
import os
import subprocess
import sys

if os.name == 'nt':
    import ctypes

    def is_admin():
        try:
            return ctypes.windll.shell32.IsUserAnAdmin()
        except Exception:
            return False

    def run_as_admin():
        script = os.path.abspath(sys.argv[0])
        params = ' '.join([f'"{arg}"' for arg in sys.argv[1:]])
        try:
            ctypes.windll.shell32.ShellExecuteW(
                None,
                'runas',
                sys.executable,
                f'"{script}" {params}',
                None,
                1,
            )
            sys.exit(0)
        except Exception:
            return False

    if not is_admin():
        if not run_as_admin():
            raise RuntimeError('관리자 권한으로 실행할 수 없습니다.')

if __name__ == '__main__':
    if os.name == 'nt' and not getattr(sys, 'frozen', False):
        if not os.environ.get('SUBCULTURE_TRACKER_NO_CONSOLE'):
            pythonw = os.path.join(os.path.dirname(sys.executable), 'pythonw.exe')
            if os.path.isfile(pythonw):
                env = os.environ.copy()
                env['SUBCULTURE_TRACKER_NO_CONSOLE'] = '1'
                subprocess.Popen([pythonw, __file__, *sys.argv[1:]], env=env, close_fds=True)
                sys.exit(0)

    if getattr(sys, 'frozen', False):
        project_root = os.path.dirname(sys.executable)
    else:
        project_root = os.path.dirname(os.path.abspath(__file__))
    log_path = os.path.join(project_root, 'lastlog.log')
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s %(name)s: %(message)s',
        handlers=[
            logging.FileHandler(log_path, mode='w', encoding='utf-8'),
            logging.StreamHandler(sys.stdout),
        ],
    )

    import backend.web as backend_web

    dev_mode = '-dev' in sys.argv[1:]
    logging.info('Starting Subculture Tracker, log file: %s', log_path)
    backend_web.run(use_browser=dev_mode)
