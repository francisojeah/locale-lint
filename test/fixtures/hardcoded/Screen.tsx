export function Screen({ name }: { name: string }) {
  return (
    <>
      <Text>Welcome to the platform</Text>
      <Text>{name}</Text>
      <Text>42</Text>
      <Text>OK</Text>
      <TextInput placeholder="Enter your email" />
      <Icon alt="Logo" onPress={go} />
      <code>const x = 1</code>
    </>
  );
}
