#!/usr/bin/env python3
import base64, json, subprocess, urllib.error, urllib.request
ROOT=r"C:\Users\Admin\Desktop\workspace\001\eq-worker"
ACC=r"C:\Users\Admin\.agent-secrets\accounts.json"
API="https://api.github.com"
def git(*a):
    return subprocess.run(["git","-c","core.quotepath=false",*a],cwd=ROOT,capture_output=True,check=True).stdout
def api(tok,m,p,payload=None):
    d=json.dumps(payload).encode() if payload is not None else None
    r=urllib.request.Request(API+p,data=d,method=m,headers={"Authorization":f"token {tok}","User-Agent":"x","Accept":"application/vnd.github+json","Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(r,timeout=120) as x:
            b=x.read(); return json.loads(b) if b else {}
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{m} {p} -> {e.code}: {e.read().decode('utf-8','replace')[:300]}") from None
def tree(tok,repo,sha):
    d=api(tok,"GET",f"/repos/{repo}/git/trees/{sha}?recursive=1")
    if d.get("truncated"): raise RuntimeError("truncated")
    return {i["path"]:(i["mode"],i["sha"]) for i in d["tree"] if i["type"]=="blob"}
def mirror(acct,repo):
    tok=json.load(open(ACC,encoding="utf-8"))["platforms"]["github"]["accounts"][acct]["token"]
    head=git("rev-parse","HEAD").decode().strip()
    ref=api(tok,"GET",f"/repos/{repo}/git/ref/heads/main"); base=ref["object"]["sha"]
    if base==head: print(f"{repo}: up to date"); return
    bt=api(tok,"GET",f"/repos/{repo}/git/commits/{base}")["tree"]["sha"]
    old=tree(tok,repo,bt); new=git("ls-tree","-r",head).decode()
    local={}
    for line in new.splitlines():
        meta,path=line.split("\t",1); mode,_,sha=meta.split(); local[path]=(mode,sha)
    entries=[]
    for path in sorted(set(old)|set(local)):
        if path in old and path in local and old[path][1]==local[path][1]: continue
        if path not in local: entries.append({"path":path,"mode":"100644","type":"blob","sha":None}); continue
        mode,sha=local[path]
        if path in old and old[path][1]==sha: entries.append({"path":path,"mode":mode,"type":"blob","sha":sha}); continue
        blob=git("cat-file","-p",f"{head}:{path}")
        ns=api(tok,"POST",f"/repos/{repo}/git/blobs",{"content":base64.b64encode(blob).decode(),"encoding":"base64"})["sha"]
        entries.append({"path":path,"mode":mode,"type":"blob","sha":ns})
    ts=api(tok,"POST",f"/repos/{repo}/git/trees",{"base_tree":bt,"tree":entries})["sha"] if entries else bt
    msg=git("log","-1","--pretty=%B").decode().strip()
    c=api(tok,"POST",f"/repos/{repo}/git/commits",{"message":msg,"tree":ts,"parents":[base]})["sha"]
    api(tok,"PATCH",f"/repos/{repo}/git/refs/heads/main",{"sha":c,"force":False})
    chk=api(tok,"GET",f"/repos/{repo}/git/ref/heads/main")["object"]["sha"]
    t2=api(tok,"GET",f"/repos/{repo}/git/commits/{chk}")["tree"]["sha"]
    print(f"{repo}: {base[:7]}->{c[:7]} files={len(entries)} tree={t2[:7]} ok={chk==c}")
for a,r in [("badhope","badhope/EQ-Worker"),("X33834","X33834/EQ-Worker"),("Morningstar202604","Morningstar202604/EQ-Worker")]:
    mirror(a,r)
