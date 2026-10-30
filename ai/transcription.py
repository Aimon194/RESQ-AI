def transcribe_audio(path: str) -> dict:
    """Optional faster-whisper path; never returns invented transcript text."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return {'available':False,'text':None,'reason':'faster-whisper is not installed; transcript unavailable'}
    try:
        model=WhisperModel('small',device='cpu',compute_type='int8')
        segments,_=model.transcribe(path)
        return {'available':True,'text':' '.join(s.text for s in segments).strip(),'reason':'Transcribed locally with faster-whisper'}
    except Exception:
        return {'available':False,'text':None,'reason':'Transcription failed; enter report text manually'}
